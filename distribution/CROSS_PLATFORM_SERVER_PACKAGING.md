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

All downloaded source and binary archives are version-pinned and verified against a SHA-256 digest before extraction. A source URL, release tag, and file name are **not** an immutable trust boundary by themselves. The following current official FrankenPHP `v1.12.7` assets were deliberately accepted after a documented provenance, digest, linkage, and non-interactive version audit; they are now the explicit trusted inputs for this branch.[8] [9]

| Target              | Audited filename                | Accepted SHA-256                                                   |
| ------------------- | ------------------------------- | ------------------------------------------------------------------ |
| Linux x64           | `frankenphp-linux-x86_64`       | `207f65229637ae698e816ef7cbac31dd2bb57322a95d280789cea93e32cdd4f9` |
| Windows x64         | `frankenphp-windows-x86_64.zip` | `52fb7d1d8ca785599189789f813dd5cd2c29892ed2eaa3fdaab07e938e551870` |
| macOS Apple Silicon | `frankenphp-mac-arm64`          | `a44f6bcb1da73e09abfbadfbf3126f0454d9821c5576f89465ed060d8f9a5c50` |
| macOS Intel         | `frankenphp-mac-x86_64`         | `283dc2821190e46703b7f67c1ed8955ec9f315f7a089473cad306288f2354281` |

The verification remains **fail-closed**: any later digest mismatch rejects the asset before extraction and cannot be accepted automatically. A future replacement requires a new explicit review and a deliberate pin change; changing a digest merely to make a build pass remains prohibited. The post-extraction executable contract requires the exact semantic version `1.12.7`. It deliberately accepts both official renderings, `FrankenPHP v1.12.7 …` and `FrankenPHP 1.12.7 …`, but rejects prefixes, suffix versions, and unrelated output. Linux uses the upstream FrankenPHP binary and MariaDB systemd binary tarball. macOS uses the upstream FrankenPHP binary and builds MariaDB 11.4.9 from the verified source archive in a fresh out-of-source CMake directory.

The macOS MariaDB server uses bundled wolfSSL, PCRE, and zlib. Its Connector/C client utilities are configured independently with `CONC_WITH_SSL=OPENSSL`, `OPENSSL_USE_STATIC_LIBS=TRUE`, and an explicit `OPENSSL_ROOT_DIR` set from `ACCORE_MACOS_OPENSSL_ROOT`. CI installs `openssl@3` only as a build input and proves that `libssl.a` and `libcrypto.a` exist before CMake configures; no Homebrew GnuTLS, OpenSSL, or other Homebrew dynamic library may remain in the staged payload. The Mach-O verifier remains authoritative and rejects any external or unresolved load command. This avoids copying an unstable Homebrew dependency closure while leaving the shipped runtime self-contained.

The MariaDB policy keeps `INSTALL_MYSQLTESTDIR=mariadb-test` relative during CMake installation, disables both `PLUGIN_AUTH_PAM` variants; the optional `provider_bzip2`, `provider_lz4`, `provider_lzma`, `provider_lzo`, and `provider_snappy` server compression plugins; and Connector/C's default-dynamic `zstd` compression plugin. RocksDB, Archive, Mroonga, Connect, Spider, OQGraph, Sphinx, WSREP/Galera, MariaBackup, embedded server, and components not needed by ACCORE ERP are also disabled. MariaDB documents the five server compression providers as optional plugins that otherwise introduce separate runtime library dependencies; ACCORE retains bundled/static zlib only and does not support restoring a database that already uses one of the disabled optional compression algorithms.[12] The final payload guard removes and rejects test trees; test aliases such as `mysql_client_test` and `mysqltest`; backup, Galera, and WSREP programs; their manuals and support files; and matching engine, PAM, WSREP, QA, debug, and example plugins. It recursively rejects dangling symlinks and symlinks that resolve outside the payload. This retains the required `mariadbd`, `mariadb`, `mariadb-dump`, `mariadb-install-db`, InnoDB, Aria, MyISAM, and `auth_ed25519` runtime capabilities. MariaDB plugin options use the `PLUGIN_<name>=NO` form; `WITH_ROCKSDB=OFF` is not a valid substitute for disabling the RocksDB storage engine.[3] [4]

After the macOS runtime is staged, the build removes FrankenPHP's residual `/usr/local/lib` search path **only after proving that the executable has no `@rpath` dependency that could use it**, then executes the non-interactive binary contract `frankenphp --version`. It identifies **every Mach-O file** in the runtime and later in the completed Tauri application, runs `otool -L`, inspects each `LC_RPATH`, and resolves every actual `LC_LOAD_DYLIB` `@loader_path`, `@executable_path`, and `@rpath` reference to an existing file contained by the payload. A dylib's matching `LC_ID_DYLIB` is validated separately as an advertised, portable identity rather than treated as a self-dependency; this does not exempt any other load command. It rejects absolute build-machine paths and any relative reference that escapes or fails to resolve inside the payload. To avoid serial debugging, verification scans every Mach-O candidate and reports all failures in one diagnostic rather than stopping after the first external dependency. The CI then builds PKG payloads with recommended system ownership, verifies their file lists, installs each macOS PKG on the runner, checks the root-owned agent and LaunchDaemon, waits for public `ready` status, repeats installation to prove that the protected configuration and data remain, and finally cleans the runner. The build tools may be present on CI, but their libraries must never become an undeclared end-user dependency.[8]

## Linux Server Desktop RPM performance contract

The Linux Server Desktop runtime is intentionally large because it embeds the database server and application. The RPM bundler uses supported `gzip` compression at level `1`, prioritizing bounded build time over marginal archive-size savings. CI grants the Linux Server Desktop matrix entry a 120-minute limit while retaining the 60-minute default for all other Desktop matrix entries. This is a targeted safeguard for the known RPM resource-compression behavior with a large resource tree; it does not remove RPM as a supported Linux delivery path.[10] [11]

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

[8] [FrankenPHP — standalone binary usage](https://frankenphp.dev/docs/)

[9] [FrankenPHP v1.12.7 — official release assets](https://github.com/dunglas/frankenphp/releases/tag/v1.12.7)

[10] [Tauri v2 configuration reference — RPM bundle configuration](https://v2.tauri.app/reference/config/#rpmbundleconfig)

[11] [Tauri issue #11478 — long RPM build time with large bundled resources](https://github.com/tauri-apps/tauri/issues/11478)

[12] [MariaDB — Compression Plugins](https://mariadb.com/docs/server/ha-and-performance/optimization-and-tuning/optimization-and-tuning-compression/compression-plugins)
