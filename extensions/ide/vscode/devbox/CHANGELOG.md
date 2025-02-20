# Change Log

All notable changes to the "devbox" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [1.3.4] - 2025-02-18

### Fixed

- Windsurf can not open.

## [1.3.1] - 2025-01-21

### Added

- Support Windsurf and Trae.

## [1.3.0] - 2024-12-24

### Fixed

- Fix http url -> https url.

## [1.2.3] - 2024-12-24

### Fixed

- Fix Windows file authority issue caused by `Everyone` group.

## [1.2.2] - 2024-12-09

### Changed

- Adjust `Remote-SSH` to install by code.

### Fixed

- Fix Windows file authority issue caused by `Everyone` group.

## [1.2.1] - 2024-12-4

### Fixed

- Fix the bug `devbox_config` not found when activating devbox list view.

### Changed

- Write file `Remote-ssh.remotePlatform` config by devbox.

## [1.2.0] - 2024-12-3

### Added

- Simple backup devbox ssh config.
- UI style optimization and some little buttons of `Database` panel and `Network` panel.
- I18n support.

### Fixed

### Changed

- remove the `devbox` control of the `Remote-SSH` config.

## [1.0.0] - 2024-11-13

### Added

- Devbox basic management: Create(in web page),Delete(delete local ssh config),Open,Refresh,State.
- Network panel,Database panel: View network and database information，open network port in browser or vscode integrated browser,copy database connection string.
- Adapt to dark theme.
- custom your own API Region and Zone.
- Delete devbox in web page will delete local ssh config.

### Fixed

- windows file authority issue cause connection error.
- Connection error caused by `Remote-SSH` custom ssh config path.

### Changed

- update ssh config file format.

### Security

- Replace `child_process` with `execa` to avoid security issues.
- Deal with path traversal attack.
