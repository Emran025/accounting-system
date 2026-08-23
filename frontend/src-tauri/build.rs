use std::env;

fn main() {
    println!("cargo:rerun-if-env-changed=ACCORE_PRODUCT_FLAVOR");
    // Server runtime is staged after the Rust target cache is restored. Track
    // the whole directory so Tauri regenerates its resource manifest when a
    // verified payload adds or removes files between builds.
    println!("cargo:rerun-if-changed=resources/server-runtime");

    let has_server_feature = env::var_os("CARGO_FEATURE_SERVER_PRODUCT").is_some();
    let has_client_feature = env::var_os("CARGO_FEATURE_CLIENT_PRODUCT").is_some();

    if has_server_feature && has_client_feature {
        panic!("server-product and client-product cannot be compiled into the same Accore binary");
    }

    let requested_flavor = env::var("ACCORE_PRODUCT_FLAVOR").ok();
    let compiled_flavor = match (
        has_server_feature,
        has_client_feature,
        requested_flavor.as_deref(),
    ) {
        (true, false, Some("server")) | (true, false, None) => "server",
        (false, true, Some("client")) | (false, true, None) => "client",
        (false, false, None) | (false, false, Some("development")) => "development",
        (true, false, Some(value)) => {
            panic!("server-product requires ACCORE_PRODUCT_FLAVOR=server, got {value}")
        }
        (false, true, Some(value)) => {
            panic!("client-product requires ACCORE_PRODUCT_FLAVOR=client, got {value}")
        }
        (false, false, Some(value)) => {
            panic!("a product flavor feature is required for ACCORE_PRODUCT_FLAVOR={value}")
        }
        (true, true, _) => unreachable!("feature conflict is handled above"),
    };

    println!("cargo:rustc-env=ACCORE_COMPILED_PRODUCT_FLAVOR={compiled_flavor}");
    tauri_build::build();
}
