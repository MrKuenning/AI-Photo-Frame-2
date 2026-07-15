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
    'NSFW_FOLDERS': ['nsfw'],
    'SAFE_FOLDERS': ['SAFE'],
    'NUDITY_THRESHOLD': 0.5,
    'NSFW_LABELS': [
        'FEMALE_BREAST_EXPOSED', 'FEMALE_GENITALIA_EXPOSED',
        'MALE_GENITALIA_EXPOSED', 'BUTTOCKS_EXPOSED', 'ANUS_EXPOSED'
    ],
    'SAFE_MODE_DEFAULT': False,
    'CONTENT_SCAN_DEFAULT': False,
    'METADATA_EXTRACTION': True,
    'CONTENT_LOCK_DEFAULT': False,
    'HIDE_ARCHIVE': False,
    'LOGGING_LEVEL': 'basic',
    'THUMBNAIL_ASPECT_RATIO': 'square',
    'HOME_THUMBNAIL_COLUMNS_DEFAULT': 3,
    'GALLERY_THUMBNAIL_SIZE_DEFAULT': 3,
    # Action passphrase overrides
    'DELETE_PASSPHRASE': '',
    'FLAG_PASSPHRASE': '',
    'ARCHIVE_PASSPHRASE': '',
    'SETTINGS_PASSPHRASE': '',
    # Toggle passphrase overrides
    'TOGGLE_CONTENT_SCAN_PASSPHRASE': '',
    'TOGGLE_CONTENT_LOCK_PASSPHRASE': '',
    'TOGGLE_SAFEMODE_PASSPHRASE': '',
    # Content scan settings
    'CONTENT_SCAN_OFFSET': 0,
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
            'TOGGLE_SAFEMODE_PASSPHRASE',
            'THUMBNAIL_ASPECT_RATIO',
        ]
        for key in string_keys:
            if key.lower() in section:
                self._data[key] = section.get(key.lower(), self._data[key]).strip()

        # Boolean values
        bool_keys = [
            'SAFE_MODE_DEFAULT', 'CONTENT_SCAN_DEFAULT', 'METADATA_EXTRACTION',
            'CONTENT_LOCK_DEFAULT', 'HIDE_ARCHIVE',
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
        while True:
            print(f"\n[SETUP] Monitor folder '{self._data['IMAGE_FOLDER']}' not found or invalid.")
            print("[SETUP] Please enter the full path to the root directory you want to monitor:")
            print("[SETUP] Example: E:\\AI\\Output")
            try:
                new_path = input("> ").strip().strip('"').strip("'")
                if new_path and os.path.isdir(new_path):
                    self._data['IMAGE_FOLDER'] = new_path
                    break
                else:
                    print("[SETUP] Error: That folder does not exist. Please enter a valid directory.")
            except EOFError:
                print("\n[SETUP] Input cancelled. Cannot start without a valid monitor folder.")
                exit(1)

    def _save_config(self, config: configparser.ConfigParser):
        """Save current configuration to config.ini"""
        try:
            if 'App' not in config:
                config['App'] = {}
            for key, value in self._data.items():
                if isinstance(value, list):
                    config['App'][key] = ', '.join(str(v) for v in value)
                elif isinstance(value, bool):
                    config['App'][key] = 'true' if value else 'false'
                else:
                    config['App'][key] = str(value)

            with open(self._config_path, 'w') as f:
                config.write(f)
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
