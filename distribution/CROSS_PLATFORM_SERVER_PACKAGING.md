# ACCORE ERP cross-platform server packaging contract

## Product boundary and supported delivery paths

A server package contains the **ACCORE Server Agent**, the SHA-256-verified embedded runtime, the Laravel application payload, and the native service definition required by its host operating system. The desktop client is a control surface: it does not spawn MariaDB, FrankenPHP, or the queue directly. Lifecycle operations always pass through the agent, which records a single owner for the protected server instance and prevents one product flavor from silently taking over another.

| Platform                      | Server Desktop delivery                                                                                             | Headless delivery     | Native service manager          | Durable private data root                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------- | ------------------------------------------------ |
| Windows x64                   | Tauri MSI/NSIS bundle with embedded runtime                                                                         | Silent NSIS installer | Windows Service Control Manager | `%ProgramData%\ACCORE ERP\Server`                |
| Linux x64                     | System-native Tauri DEB/RPM; portable AppImage is attach/status only                                                | DEB, RPM, and tarball | systemd                         | `/var/lib/accore-erp/server`                     |
| macOS Apple Silicon and Intel | Administrator-installed PKG places the Tauri application in `/Applications`; the unsigned DMG is attach/status only | Unsigned PKG          | launchd LaunchDaemon            | `/Library/Application Support/ACCORE ERP/Server` |

> **Portable desktop safety boundary.** A desktop bundle may request elevation only for a root-owned, non-group-writable agent. Consequently, an AppImage copied to an arbitrary user-writable directory and a macOS application executed from a DMG or Downloads folder cannot claim a service. They can attach to an already installed Headless service and read its public status. This is deliberate: an untrusted executable must never receive administrator privileges.

## Ownership, privilege, and lifecycle contract

The first successful `claim` or Headless installation writes the server-instance receipt. The receipt identifies whether the protected instance belongs to **Server Desktop** or **Server Headless**. A Server Desktop application attaches to a Headless-owned service instead of replacing it; an ownership transfer requires the explicit, elevated transition operation. Service removal is similarly owner-aware and idempotent. On Windows, a repeated claim updates the SCM registration but does not stop a healthy running agent; SCM configuration changes take effect on the next explicit service restart.[5]

| Operation                             | Windows                                                                           | Linux                                                                                                                                            | macOS                                                                                                                                                                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Install or claim                      | Elevated agent configures the SCM service.                                        | A root-owned agent invokes the native system integration through `pkexec`; native DEB/RPM delivery is required for a new Desktop-owned instance. | An administrative Desktop PKG installs a root-owned application in `/Applications`, then activates or refreshes a Desktop-owned LaunchDaemon. If Headless already owns the instance, Desktop attaches without replacing it. |
| Attach to an existing Headless server | Agent records a Desktop control-surface attachment without replacing the service. | Same, using the installed Headless agent at `/opt/accore-erp/server`.                                                                            | Same, using the installed Headless agent at `/Library/ACCORE ERP/Server`.                                                                                                                                                   |
| Run service                           | SCM supervises the agent.                                                         | A `Type=exec` unit runs as the dedicated `accore` account.                                                                                       | A root-owned LaunchDaemon keeps the foreground agent alive.                                                                                                                                                                 |
| Public monitoring                     | Read-only status under `%ProgramData%\ACCORE ERP\Server Status`.                  | Read-only status under `/var/lib/accore-erp/Server Status`.                                                                                      | Read-only status under `/Library/Application Support/ACCORE ERP/Server Status`.                                                                                                                                             |

Linux private data is owned by the `accore` system account; systemd uses `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=strict`, `ProtectHome`, a restrictive `UMask`, and explicit writable paths. The macOS plist is written beneath `/Library/LaunchDaemons`, owned by `root:wheel`, and mode `0600`. The agent runs in the foreground because launchd, like systemd, is the process supervisor rather than the application itself.[1] [2]

## Runtime discovery and self-containment

The package contains no Node.js, Rust toolchain, PHP installation, Homebrew installation, or database administration tool requirement for the end-user machine. Tauri resources are resolved as `resources/server-runtime/<target>` where available. The agent also recognizes the macOS application layout, in which the executable is in `Contents/MacOS` and packaged resources are in `Contents/Resources`.

| Runtime target                   | Embedded FrankenPHP | Embedded MariaDB root                 | Required database executables                                               |
| -------------------------------- | ------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `windows-x86_64`                 | `frankenphp.exe`    | `mariadb-11.4.9-winx64`               | `mariadbd.exe`, `mariadb.exe`, `mariadb-dump.exe`, `mariadb-install-db.exe` |
| `linux-x86_64`                   | `frankenphp`        | `mariadb-11.4.9-linux-systemd-x86_64` | `mariadbd`, `mariadb`, `mariadb-dump`, `scripts/mariadb-install-db`         |
| `macos-aarch64` / `macos-x86_64` | `frankenphp`        | `mariadb`                             | `mariadbd`, `mariadb`, `mariadb-dump`, `scripts/mariadb-install-db`         |

The backup and isolated restore-validation paths use these platform-specific executable names. A runtime that lacks any required executable is rejected before the agent claims or starts a service.

## Runtime supply chain and macOS linkage policy

All downloaded source and binary archives are version-pinned and verified against a SHA-256 digest before extraction. Linux uses the upstream FrankenPHP binary and MariaDB systemd binary tarball. macOS uses the upstream FrankenPHP binary and builds MariaDB 11.4.9 from the verified source archive in a fresh out-of-source CMake directory.

The macOS MariaDB build uses the bundled TLS, PCRE, and zlib implementations, sets `INSTALL_MYSQLTESTDIR=` so the MariaDB test suite is not shipped, and disables RocksDB with `PLUGIN_ROCKSDB=NO` together with optional engines and components not needed by ACCORE ERP. This retains the required InnoDB, Aria, and MyISAM capabilities while avoiding optional native dependencies. MariaDB plugin options use the `PLUGIN_<name>=NO` form; `WITH_ROCKSDB=OFF` is not a valid substitute for disabling the RocksDB storage engine.[3] [4]

After the macOS runtime is staged, the build removes FrankenPHP's residual `/usr/local/lib` search path **only after proving that the executable has no `@rpath` dependency that could use it**, then executes `frankenphp php-cli --version`. It identifies **every Mach-O file** in the runtime and later in the completed Tauri application, runs `otool -L`, inspects each `LC_RPATH`, and resolves every `@loader_path`, `@executable_path`, and `@rpath` reference to an existing file contained by the payload. It rejects absolute build-machine paths and any relative reference that escapes or fails to resolve inside the payload. The CI then builds PKG payloads with recommended system ownership, verifies their file lists, installs each macOS PKG on the runner, checks the root-owned agent and LaunchDaemon, waits for public `ready` status, repeats installation to prove that the protected configuration and data remain, and finally cleans the runner. The build tools may be present on CI, but their libraries must never become an undeclared end-user dependency.

## macOS artifact verification

The Server Desktop PKG is generated from the completed Tauri `.app` after the runtime and sidecar are bundled. The builder discovers the resulting agent sidecar in `Contents/MacOS` rather than inferring its name from the target-suffixed build input, and it verifies the application executable, agent, and runtime under `Contents/Resources/resources/server-runtime/<target>`. Its `preinstall` step stops only a Desktop-owned daemon; it never deletes durable data or interrupts a Headless-owned daemon. Its `postinstall` step either attaches to an installed Headless owner or claims the Desktop runtime from the root-owned application package. The Headless PKG continues to install beneath `/Library/ACCORE ERP/Server` with the same non-destructive upgrade rule. Both package types are checked from their package file lists and then exercised through macOS Installer, launchd, runtime command probes, and same-version reinstallation during CI before release artifacts may be staged.[6] [7]

## Signing and release caveat

Windows release signing and Tauri updater signing use release secrets when they are configured. **macOS packages are currently unsigned and unnotarized** because no Apple Developer ID or notarization credentials are available. The pipeline must state this fact in release notes and must not claim seamless Gatekeeper installation. The internal runtime integrity checks above are additional safeguards; they are not a replacement for Apple code signing or notarization.

## References

[1] [systemd.service — Type=exec and service process semantics](https://www.freedesktop.org/software/systemd/man/systemd.service.html)

[2] [Apple — Creating Launch Daemons and Agents](https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html)

[3] [MariaDB — Compiling MariaDB from source](https://mariadb.com/kb/en/compiling-mariadb-from-source/)

[4] [MariaDB 11.4.9 source — RocksDB CMake plugin gate](https://github.com/MariaDB/server/blob/mariadb-11.4.9/storage/rocksdb/CMakeLists.txt)

[5] [Microsoft — ChangeServiceConfig function](https://learn.microsoft.com/en-us/windows/win32/api/winsvc/nf-winsvc-changeserviceconfiga)

[6] [Apple — Packaging Mac software for distribution](https://developer.apple.com/documentation/xcode/packaging-mac-software-for-distribution)

[7] [`pkgbuild(1)` — root payload and ownership behavior](https://keith.github.io/xcode-man-pages/pkgbuild.1.html)
