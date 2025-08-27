{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.bashInteractive
    pkgs.git
    pkgs.python3
    pkgs.gcc
    pkgs.gnumake
    pkgs.pkg-config
  ];
  env = {
    NODE_ENV = "development";
    NPM_CONFIG_UPDATE_NOTIFIER = "false";
  };
}
