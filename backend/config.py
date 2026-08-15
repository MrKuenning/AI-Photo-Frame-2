"""
Configuration loader for Photo Frame 6.
Reads settings from config.ini with sensible defaults.
"""

import os
import configparser
from typing import List, Optional


# Default configuration values
DEFAULTS = {
    'PORT': 5000,
    'IMAGE_FOLDER': '',
    'MAX_INITIAL_LOAD': 100,
    'LOGGING_LEVEL': 'basic',
    
    # Grid Settings
    'HOME_THUMBNAIL_COLUMNS_DEFAULT': 3,
    'GALLERY_THUMBNAIL_SIZE_DEFAULT': 3,
    'THUMBNAIL_ASPECT_RATIO': 'square',
    
    # Folders & Definitions
    'NSFW_FOLDERS': ['nsfw'],
    'SAFE_FOLDERS': ['SAFE'],
    'NSFW_KEYWORDS': [
        'adult', 'ass', 'bikini', 'boob', 'booty', 'bra', 'busty', 'camgirl',
        'camwhore', 'cleavage', 'curvy', 'dominatrix', 'escort', 'erotic', 'explicit',
        'fetish', 'gstring', 'hardcore', 'hot girl', 'hot woman', 'intimate', 'kink',
        'latex', 'leotard', 'lingerie', 'lust', 'modeling', 'naked', 'nipple',
        'nipples', 'nude', 'nudes', 'nsfw', 'onlyfans', 'panties', 'pantyhose',
        'panty', 'playboy', 'porn', 'pornographic', 'pornstar', 'provocative',
        'seductive', 'sensual', 'sex', 'sexually', 'softcore', 'stripper', 'suggestive',
        'swimsuit', 'thick', 'thighs', 'thong', 'topless', 'underwear', 'wet', 'penis',
        'dancing', 'breast', 'bathing', 'swim', 'xxx', 'yoga'
    ],
    'NSFW_LABELS': [
        'FEMALE_BREAST_EXPOSED', 'FEMALE_GENITALIA_EXPOSED',
        'MALE_GENITALIA_EXPOSED', 'BUTTOCKS_EXPOSED', 'ANUS_EXPOSED'
    ],
    
    # Feature Toggles
    'METADATA_EXTRACTION': True,
    'HIDE_ARCHIVE': False,
    'ENABLE_ARCHIVE_OPTION': True,
    
    # Keyword Filter Settings
    'ENABLE_KEYWORD_FILTER_OPTION': True,
    'KEYWORD_FILTER_DEFAULT': False,
    'TOGGLE_KEYWORD_FILTER_PASSPHRASE': '',
    
    # Safe Only Settings
    'ENABLE_SAFE_ONLY_OPTION': True,
    'SAFE_ONLY_DEFAULT': False,
    'TOGGLE_SAFE_ONLY_PASSPHRASE': '',
    
    # Folder Lock Settings
    'ENABLE_CONTENT_LOCK_OPTION': True,
    'CONTENT_LOCK_DEFAULT': False,
    'TOGGLE_CONTENT_LOCK_PASSPHRASE': '',
    
    # Content Scan Settings
    'ENABLE_CONTENT_SCAN_OPTION': True,
    'CONTENT_SCAN_DEFAULT': False,
    'TOGGLE_CONTENT_SCAN_PASSPHRASE': '',
    'CONTENT_SCAN_OFFSET': 0,
    'NUDITY_THRESHOLD': 0.5,
    'SCAN_VIDEO_FILES': True,
    
    # Security / Passphrases
    'DELETE_PASSPHRASE': '',
    'FLAG_PASSPHRASE': '',
    'ARCHIVE_PASSPHRASE': '',
    'SETTINGS_PASSPHRASE': '',
}


class Config:
    """Application configuration loaded from config.ini"""

    def __init__(self):
        self._data = dict(DEFAULTS)
        self._config_path = self._find_config_path()

    def _find_config_path(self) -> str:
        """Find config.ini - check project root first, then backend dir"""
        # Project root (one level up from backend/)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        root_config = os.path.join(project_root, 'config.ini')
        if os.path.exists(root_config):
            return root_config

        # Backend directory
        backend_config = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.ini')
        if os.path.exists(backend_config):
            return backend_config

        # Default to project root (will be created)
        return root_config

    def load(self) -> 'Config':
        """Load configuration from config.ini file"""
        config = configparser.ConfigParser()
        config_needs_saving = False

        if os.path.exists(self._config_path):
            config.read(self._config_path)

            if 'App' in config:
                self._load_from_section(config['App'])

            print(f"[OK] Loaded configuration from {self._config_path}")
        else:
            print(f"[SETUP] Config file not found at {self._config_path}")
            config_needs_saving = True

        # Validate image folder
        if not self._data['IMAGE_FOLDER'] or not os.path.isdir(self._data['IMAGE_FOLDER']):
            self._prompt_for_image_folder()
            config_needs_saving = True

        # Save config if needed
        if config_needs_saving:
            self._save_config(config)

        return self

    def _load_from_section(self, section):
        """Load values from a config section"""
        # Integer values
        for key in ['PORT', 'MAX_INITIAL_LOAD', 'CONTENT_SCAN_OFFSET', 'HOME_THUMBNAIL_COLUMNS_DEFAULT', 'GALLERY_THUMBNAIL_SIZE_DEFAULT']:
            if key.lower() in section:
                try:
                    self._data[key] = int(section.get(key.lower(), str(self._data[key])))
                except (ValueError, KeyError):
                    pass

        # Float values
        for key in ['NUDITY_THRESHOLD']:
            if key.lower() in section:
                try:
                    self._data[key] = float(section.get(key.lower(), str(self._data[key])))
                except (ValueError, KeyError):
                    pass

        # String values
        string_keys = [
            'IMAGE_FOLDER', 'LOGGING_LEVEL',
            'DELETE_PASSPHRASE', 'FLAG_PASSPHRASE', 'ARCHIVE_PASSPHRASE',
            'SETTINGS_PASSPHRASE',
            'TOGGLE_CONTENT_SCAN_PASSPHRASE',
            'TOGGLE_CONTENT_LOCK_PASSPHRASE',
            'TOGGLE_KEYWORD_FILTER_PASSPHRASE',
            'TOGGLE_SAFE_ONLY_PASSPHRASE',
            'THUMBNAIL_ASPECT_RATIO',
        ]
        for key in string_keys:
            if key.lower() in section:
                self._data[key] = section.get(key.lower(), self._data[key]).strip()

        # Boolean values
        bool_keys = [
            'ENABLE_KEYWORD_FILTER_OPTION', 'ENABLE_CONTENT_SCAN_OPTION', 'ENABLE_CONTENT_LOCK_OPTION', 'ENABLE_SAFE_ONLY_OPTION',
            'ENABLE_ARCHIVE_OPTION',
            'KEYWORD_FILTER_DEFAULT', 'SAFE_ONLY_DEFAULT', 'CONTENT_SCAN_DEFAULT', 'METADATA_EXTRACTION',
            'CONTENT_LOCK_DEFAULT', 'HIDE_ARCHIVE', 'SCAN_VIDEO_FILES',
        ]
        for key in bool_keys:
            if key.lower() in section:
                val = section.get(key.lower(), '').strip().lower()
                self._data[key] = val in ('true', '1', 'yes')

        # Comma-separated list values
        list_keys = {
            'NSFW_KEYWORDS': str.lower,
            'NSFW_FOLDERS': str.lower,
            'SAFE_FOLDERS': str.strip,
            'NSFW_LABELS': lambda x: x.strip().upper(),
        }
        for key, transform in list_keys.items():
            if key.lower() in section:
                raw = section.get(key.lower(), '')
                if raw.strip():
                    self._data[key] = [transform(item.strip()) for item in raw.split(',') if item.strip()]

        # Normalize logging level
        self._data['LOGGING_LEVEL'] = self._data['LOGGING_LEVEL'].lower()

    def _prompt_for_image_folder(self):
        """Prompt user for image folder path"""
        current_folder = self._data.get('IMAGE_FOLDER', '')
        print("\n" + "=" * 60)
        print("  STEP 2: CONFIGURATION SETUP - Set Monitored Folder")
        print("=" * 60)
        if current_folder:
            print(f"\nThe configured folder path was not found on this computer:")
            print(f"  -> '{current_folder}'")
        else:
            print(f"\nNo monitored folder is configured yet.")

        print("\nPlease enter the full path to your AI image/video folder.")
        print("Example: C:\\AI\\Images  or  D:\\SD_Output")
        print("-" * 60)

        while True:
            try:
                new_path = input("Enter Folder Path > ").strip().strip('"').strip("'")
                if new_path and os.path.isdir(new_path):
                    self._data['IMAGE_FOLDER'] = os.path.abspath(new_path)
                    print(f"\n[OK] Valid folder selected: '{self._data['IMAGE_FOLDER']}'")
                    print("=" * 60 + "\n")
                    break
                else:
                    print(f"\n[ERROR] '{new_path}' is not a valid directory or does not exist.")
                    print("Please double check the drive letter and folder path and try again:\n")
            except EOFError:
                print("\n[SETUP] Input cancelled. Cannot start without a valid monitor folder.")
                exit(1)
            except KeyboardInterrupt:
                print("\n[SETUP] Setup interrupted.")
                exit(1)

    def _save_config(self, config: configparser.ConfigParser):
        """Save current configuration to config.ini, preserving comments and layout"""
        try:
            # Read existing lines if the file exists
            lines = []
            if os.path.exists(self._config_path):
                with open(self._config_path, 'r') as f:
                    lines = f.readlines()
            
            # Map config keys to values to save
            data_to_save = {}
            for key, value in self._data.items():
                if isinstance(value, list):
                    data_to_save[key.lower()] = ', '.join(str(v) for v in value)
                elif isinstance(value, bool):
                    data_to_save[key.lower()] = 'true' if value else 'false'
                else:
                    data_to_save[key.lower()] = str(value)
            
            new_lines = []
            in_app_section = False
            keys_written = set()
            
            for line in lines:
                stripped = line.strip()
                if stripped == '[App]':
                    in_app_section = True
                    new_lines.append(line)
                    continue
                elif stripped.startswith('['):
                    in_app_section = False
                    new_lines.append(line)
                    continue
                
                if in_app_section and '=' in line and not stripped.startswith('#') and not stripped.startswith(';'):
                    key_part, _ = line.split('=', 1)
                    key = key_part.strip().lower()
                    
                    if key in data_to_save:
                        prefix = line[:line.find(key_part)]
                        new_lines.append(f"{prefix}{key_part}= {data_to_save[key]}\n")
                        keys_written.add(key)
                        continue
                
                new_lines.append(line)
            
            # If [App] section was not found, create it
            if not any(line.strip() == '[App]' for line in lines):
                if new_lines and not new_lines[-1].endswith('\n'):
                    new_lines[-1] += '\n'
                new_lines.append('[App]\n')
            
            # Append any keys that weren't in the file
            for key, value in data_to_save.items():
                if key not in keys_written:
                    new_lines.append(f"{key} = {value}\n")
                    
            with open(self._config_path, 'w') as f:
                f.writelines(new_lines)
            print(f"[SETUP] Saved configuration to {self._config_path}")
        except Exception as e:
            print(f"[SETUP] Error saving config: {e}")

    def get(self, key: str, default=None):
        """Get a configuration value"""
        return self._data.get(key, default)

    def set(self, key: str, value):
        """Set a configuration value (in memory only)"""
        self._data[key] = value

    def save(self):
        """Save current config to disk"""
        config = configparser.ConfigParser()
        if os.path.exists(self._config_path):
            config.read(self._config_path)
        self._save_config(config)

    def to_dict(self) -> dict:
        """Return all config values as a dictionary"""
        return dict(self._data)

    def update_from_dict(self, settings: dict):
        """Update configuration from a dictionary and save"""
        for key, value in settings.items():
            key_upper = key.upper()
            if key_upper in self._data:
                # Handle type conversion
                if isinstance(self._data[key_upper], bool):
                    self._data[key_upper] = value if isinstance(value, bool) else str(value).lower() in ('true', '1')
                elif isinstance(self._data[key_upper], int):
                    self._data[key_upper] = int(value)
                elif isinstance(self._data[key_upper], float):
                    self._data[key_upper] = float(value)
                elif isinstance(self._data[key_upper], list):
                    if isinstance(value, str):
                        self._data[key_upper] = [v.strip() for v in value.split(',') if v.strip()]
                    else:
                        self._data[key_upper] = value
                else:
                    self._data[key_upper] = str(value)
        self.save()


# Global config instance
settings = Config()
