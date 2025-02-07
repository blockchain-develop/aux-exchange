// Code in this folder is for running go:generate.
// Put real code in folder for corresponding chain.

package aux_go_generate

// critbit
//go:generate go run github.com/fardream/gen-move-container@latest critbit -o ../aptos/contract/auxexch/sources/critbit_v.move -p aux -m critbit_v
//go:generate go run github.com/fardream/gen-move-container@latest critbit -o ../aptos/contract/auxexch/sources/critbit.move -p aux -m critbit --use-aptos-table

// reward distributor
//go:generate go run ./aptos/cmd/gen-reward-distributor -o ../aptos/contract/auxexch/sources/reward_distributor.move
//go:generate go run ./aptos/cmd/gen-reward-distributor -q -o ../aptos/contract/auxexch/sources/reward_quoter.move

// abort-only-contract
// Uncomment the below command to generate abort only contract
// //go:generate go run ./cmd/move-abort -e authority.move -i ../aptos/contract/auxexch/sources -o ../aptos/abort-only-contract/auxexch/sources
