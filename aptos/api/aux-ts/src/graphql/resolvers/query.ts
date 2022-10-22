import { promises as fs } from "fs";
import _ from "lodash";
import * as aux from "../../";
import { ALL_FAKE_COINS } from "../../client";
import { auxClient } from "../connection";
import type {
  Account,
  CoinInfo,
  Market,
  Maybe,
  Pool,
  QueryAccountArgs,
  QueryMarketArgs,
  QueryMarketsArgs,
  QueryPoolArgs,
  QueryPoolsArgs,
} from "../generated/types";

export const query = {
  address() {
    return auxClient.moduleAddress;
  },
  async coins(_parent: any): Promise<CoinInfo[]> {
    if (process.env["APTOS_PROFILE"] === "devnet") {
      return Promise.all(
        [
          [auxClient.getCoinInfo("0x1::aptos_coin::AptosCoin")],
          ALL_FAKE_COINS.map((fakeCoin) => auxClient.getFakeCoinInfo(fakeCoin)),
        ].flat()
      );
    }
    const path = `${process.cwd()}/src/indexer/data/mainnet-coin-list.json`;
    const coins = JSON.parse(await fs.readFile(path, "utf-8"));
    return coins.map((coin: any) => ({
      coinType: coin.token_type.type,
      decimals: coin.decimals,
      name: coin.name,
      symbol: coin.symbol,
    }));
  },
  async pool(_parent: any, { poolInput }: QueryPoolArgs): Promise<Maybe<Pool>> {
    const pool = await aux.Pool.read(auxClient, poolInput);
    if (pool === undefined) {
      return null;
    }
    // @ts-ignore
    return {
      coinInfoX: pool.coinInfoX,
      coinInfoY: pool.coinInfoY,
      coinInfoLP: pool.coinInfoLP,
      amountX: pool.amountX.toNumber(),
      amountY: pool.amountY.toNumber(),
      amountLP: pool.amountLP.toNumber(),
      feePercent: pool.feePct,
    };
  },
  async pools(_parent: any, args: QueryPoolsArgs): Promise<Pool[]> {
    const poolReadParams = args.poolInputs
      ? args.poolInputs
      : await aux.Pool.index(auxClient);
    const pools = await Promise.all(
      poolReadParams.map((poolReadParam) =>
        aux.Pool.read(auxClient, poolReadParam)
      )
    );
    // @ts-ignore
    return pools
      .filter((maybePool) => maybePool !== undefined && maybePool !== null)
      .map((pool) => ({
        coinInfoX: pool!.coinInfoX,
        coinInfoY: pool!.coinInfoY,
        coinInfoLP: pool!.coinInfoLP,
        amountX: pool!.amountX.toNumber(),
        amountY: pool!.amountY.toNumber(),
        amountLP: pool!.amountLP.toNumber(),
        feePercent: pool!.feePct,
      }));
  },
  async poolCoins(parent: any) {
    return this.coins(parent);
    // const pools = await this.pools(parent, {});
    // const coinInfos = pools.flatMap((pool) => [pool.coinInfoX, pool.coinInfoY]);
    // return _.uniqBy(coinInfos, (coinInfo) => coinInfo.coinType);
  },
  async market(_parent: any, args: QueryMarketArgs): Promise<Maybe<Market>> {
    let market: aux.Market;
    try {
      market = await aux.Market.read(auxClient, args.marketInput);
    } catch (err) {
      return null;
    }
    // @ts-ignore
    return {
      name: `${market.baseCoinInfo.name}-${market.quoteCoinInfo.name}`,
      baseCoinInfo: market.baseCoinInfo,
      quoteCoinInfo: market.quoteCoinInfo,
      lotSize: market.lotSize.toNumber(),
      tickSize: market.tickSize.toNumber(),
      lotSizeDecimals: market.lotSize
        .toDecimalUnits(market.baseCoinInfo.decimals)
        .toString(),
      tickSizeDecimals: market.tickSize
        .toDecimalUnits(market.quoteCoinInfo.decimals)
        .toString(),
      lotSizeString: market.lotSize.toString(),
      tickSizeString: market.tickSize.toString(),
      orderbook: {
        bids: market.l2.bids.map((l2Quote) => ({
          price: l2Quote.price.toNumber(),
          quantity: l2Quote.quantity.toNumber(),
        })),
        asks: market.l2.asks.map((l2Quote) => ({
          price: l2Quote.price.toNumber(),
          quantity: l2Quote.quantity.toNumber(),
        })),
      },
    };
  },
  async markets(_parent: any, args: QueryMarketsArgs): Promise<Market[]> {
    const markets = await aux.clob.core.query.markets(auxClient);
    const marketInputs = args.marketInputs;
    const auxCoinInfo = await auxClient.getCoinInfo(
      `${auxClient.moduleAddress}::aux_coin::AuxCoin`
    );
    if (marketInputs === undefined || marketInputs === null) {
      // @ts-ignore
      return (
        await Promise.all(
          markets.map((market) =>
            aux.Market.read(auxClient, {
              baseCoinType: market.baseCoinType,
              quoteCoinType: market.quoteCoinType,
            })
          )
        )
      ).map((market) => {
        return {
          name: `${market.baseCoinInfo.name}-${market.quoteCoinInfo.name}`,
          baseCoinInfo: market.baseCoinInfo,
          quoteCoinInfo: market.quoteCoinInfo,
          lotSize: market.lotSize.toNumber(),
          tickSize: market.tickSize.toNumber(),
          auxCoinInfo,
          orderbook: {
            bids: market.l2.bids.map((l2Quote) => ({
              price: l2Quote.price.toNumber(),
              quantity: l2Quote.quantity.toNumber(),
            })),
            asks: market.l2.asks.map((l2Quote) => ({
              price: l2Quote.price.toNumber(),
              quantity: l2Quote.quantity.toNumber(),
            })),
          },
        };
      });
    } else {
      // @ts-ignore
      return (
        await Promise.all(
          marketInputs.map((marketInput) =>
            aux.Market.read(auxClient, marketInput)
          )
        )
      )
        .filter(
          (maybeMarket) => maybeMarket !== undefined && maybeMarket !== null
        )
        .map((market) => {
          return {
            name: `${market.baseCoinInfo.name}-${market.quoteCoinInfo.name}`,
            baseCoinInfo: market.baseCoinInfo,
            quoteCoinInfo: market.quoteCoinInfo,
            lotSize: market.lotSize.toNumber(),
            tickSize: market.tickSize.toNumber(),
            auxCoinInfo,
            orderbook: {
              bids: market.l2.bids.map((l2Quote) => ({
                price: l2Quote.price.toNumber(),
                quantity: l2Quote.quantity.toNumber(),
              })),
              asks: market.l2.asks.map((l2Quote) => ({
                price: l2Quote.price.toNumber(),
                quantity: l2Quote.quantity.toNumber(),
              })),
            },
          };
        });
    }
  },
  async marketCoins(parent: any) {
    const markets = await this.markets(parent, {});
    const coinInfos = markets.flatMap((market) => [
      market.baseCoinInfo,
      market.quoteCoinInfo,
    ]);
    return _.uniqBy(coinInfos, (coinInfo) => coinInfo.coinType);
  },

  async account(_parent: any, { owner }: QueryAccountArgs): Promise<Account> {
    const auxAccount = await auxClient.getAccountResourceOptional(
      owner,
      `${auxClient.moduleAddress}::vault::AuxUserAccount`
    );

    // @ts-ignore
    return {
      address: owner,
      hasAuxAccount: auxAccount !== undefined,
    };
  },
};
