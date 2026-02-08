#!/usr/bin/env python3
"""
Name Disambiguation Resolver Utility

This utility loads the name_aliases.json and name_issues.json files
to provide convenient name normalization and disambiguation functions.

Usage:
    from name_resolver import NameResolver
    
    resolver = NameResolver()
    canonical = resolver.canonical_name('Danny Sponge')  # 'Dan Spengeman'
    
    if resolver.is_issue(person_name):
        issues = resolver.get_issues(person_name)
"""

import json
from pathlib import Path
from typing import Optional, List, Dict, Tuple


class NameResolver:
    """Load and use name disambiguation files."""
    
    def __init__(self, aliases_file: Optional[str] = None, 
                 issues_file: Optional[str] = None):
        """
        Initialize resolver with disambiguation files.
        
        Args:
            aliases_file: Path to name_aliases.json (auto-detect if None)
            issues_file: Path to name_issues.json (auto-detect if None)
        """
        # Auto-detect files in same directory
        script_dir = Path(__file__).parent
        
        self.aliases_file = Path(aliases_file or script_dir / 'name_aliases.json')
        self.issues_file = Path(issues_file or script_dir / 'name_issues.json')
        
        if not self.aliases_file.exists():
            raise FileNotFoundError(f"name_aliases.json not found at {self.aliases_file}")
        if not self.issues_file.exists():
            raise FileNotFoundError(f"name_issues.json not found at {self.issues_file}")
        
        # Load data
        with open(self.aliases_file) as f:
            self.aliases_data = json.load(f)
        
        with open(self.issues_file) as f:
            self.issues_data = json.load(f)
        
        self.alias_lookup = self.aliases_data['alias_lookup']
        self.canonical_people = {p['canonical_name']: p 
                                  for p in self.aliases_data['canonical_people']}
        self.issues_by_name = self._build_issues_index()
    
    def _build_issues_index(self) -> Dict[str, List[Dict]]:
        """Build index of names to issues."""
        issues_by_name = {}
        
        for issue in self.issues_data['self_references']:
            name = issue['person_name']
            if name not in issues_by_name:
                issues_by_name[name] = []
            issues_by_name[name].append(issue)
        
        for issue in self.issues_data['duplicate_pairs']:
            for name in issue['pair']:
                if name not in issues_by_name:
                    issues_by_name[name] = []
                issues_by_name[name].append(issue)
        
        for issue in self.issues_data['alias_separations']:
            for name in [issue['person_a'], issue['person_b']]:
                if name not in issues_by_name:
                    issues_by_name[name] = []
                issues_by_name[name].append(issue)
        
        return issues_by_name
    
    def canonical_name(self, name: str) -> str:
        """
        Get canonical form of a name.
        
        Args:
            name: Any name or alias
            
        Returns:
            Canonical form of the name (or original if not found)
        """
        return self.alias_lookup.get(name, name)
    
    def get_person_info(self, canonical_name: str) -> Optional[Dict]:
        """
        Get full person information.
        
        Args:
            canonical_name: Canonical name to look up
            
        Returns:
            Person dict with aliases, category, relation, etc.
        """
        return self.canonical_people.get(canonical_name)
    
    def get_all_aliases(self, name: str) -> List[str]:
        """
        Get all known aliases for a person (by canonical name).
        
        Args:
            name: Any form of the name (will be canonicalized)
            
        Returns:
            List of all known aliases
        """
        canonical = self.canonical_name(name)
        person = self.canonical_people.get(canonical)
        return person['aliases'] if person else [name]
    
    def normalize_names(self, names: List[str]) -> List[str]:
        """
        Normalize a list of names to canonical forms.
        
        Args:
            names: List of names in any form
            
        Returns:
            List of canonical names
        """
        return [self.canonical_name(name) for name in names]
    
    def is_unresolved(self, name: str) -> bool:
        """Check if name is in unresolved list."""
        return any(u['name'] == name for u in self.aliases_data['unresolved'])
    
    def is_compound(self, name: str) -> bool:
        """Check if name is a compound entry."""
        return any(c['compound_name'] == name for c in self.aliases_data['compound_entries'])
    
    def is_public_figure(self, name: str) -> bool:
        """Check if name is a public figure."""
        return any(p['name'] == name for p in self.aliases_data['public_figures'])
    
    def has_issues(self, name: str) -> bool:
        """Check if name has data quality issues."""
        return name in self.issues_by_name
    
    def get_issues(self, name: str) -> List[Dict]:
        """Get all issues for a name."""
        return self.issues_by_name.get(name, [])
    
    def get_self_references(self) -> List[Dict]:
        """Get all self-reference issues."""
        return self.issues_data['self_references']
    
    def get_duplicate_pairs(self) -> List[Dict]:
        """Get all duplicate pair issues."""
        return self.issues_data['duplicate_pairs']
    
    def get_alias_separations(self) -> List[Dict]:
        """Get all alias separation issues."""
        return self.issues_data['alias_separations']
    
    def get_statistics(self) -> Dict:
        """Get statistics summary."""
        return {
            'canonical_people': len(self.canonical_people),
            'alias_mappings': len(self.alias_lookup),
            'unresolved': len(self.aliases_data['unresolved']),
            'compound_entries': len(self.aliases_data['compound_entries']),
            'public_figures': len(self.aliases_data['public_figures']),
            'issues': {
                'self_references': len(self.get_self_references()),
                'duplicate_pairs': len(self.get_duplicate_pairs()),
                'alias_separations': len(self.get_alias_separations()),
            }
        }
    
    def search_aliases(self, query: str) -> List[str]:
        """
        Search for aliases matching a query string.
        
        Args:
            query: Search term (case-insensitive partial match)
            
        Returns:
            List of matching alias names
        """
        query_lower = query.lower()
        return [alias for alias in self.alias_lookup.keys() 
                if query_lower in alias.lower()]


if __name__ == '__main__':
    # Example usage
    import sys
    
    try:
        resolver = NameResolver()
        
        print("Name Disambiguation Resolver")
        print("="*50)
        print(f"\nStatistics: {json.dumps(resolver.get_statistics(), indent=2)}")
        
        # Example lookups
        print("\n\nExample Name Resolutions:")
        test_names = [
            'Danny Sponge',
            'RyGuy',
            'Darrell',
            'Boofer',
            'Unknown Person'
        ]
        
        for name in test_names:
            canonical = resolver.canonical_name(name)
            aliases = resolver.get_all_aliases(name)
            has_issues = resolver.has_issues(canonical)
            
            print(f"\n  {name}")
            print(f"    → Canonical: {canonical}")
            print(f"    → All aliases: {aliases}")
            if has_issues:
                print(f"    → Has issues: {len(resolver.get_issues(canonical))} issue(s)")
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
