{
  description = "deps - Nix-powered dependency management";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "deps";
          version = "0.1.0";

          src = ./.;

          nativeBuildInputs = [ pkgs.bun ];

          buildPhase = ''
            bun build --compile --outfile=deps src/index.ts
          '';

          installPhase = ''
            mkdir -p $out/bin
            cp deps $out/bin/
          '';
        };

        devShells.default = pkgs.mkShell {
          buildInputs = [ pkgs.bun pkgs.nodejs ];
        };
      });
}
