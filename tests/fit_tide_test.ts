import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Test recording valid activity",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('fit_tide', 'record-activity', [
        types.ascii("swimming"),
        types.uint(3600), // 1 hour
        types.uint(2000)  // 2km
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(1);
    
    // Check user stats were updated
    let statsBlock = chain.mineBlock([
      Tx.contractCall('fit_tide', 'get-user-stats', [
        types.principal(wallet1.address)
      ], wallet1.address)
    ]);
    
    const stats = statsBlock.receipts[0].result.expectOk().expectSome();
    assertEquals(stats['total-activities'], types.uint(1));
    assertEquals(stats['total-duration'], types.uint(3600));
    assertEquals(stats['total-distance'], types.uint(2000));
  },
});

Clarinet.test({
  name: "Test invalid activity type",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('fit_tide', 'record-activity', [
        types.ascii("running"), // Invalid activity
        types.uint(3600),
        types.uint(2000)
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectErr(types.uint(101)); // err-invalid-activity
  },
});

Clarinet.test({
  name: "Test achievement awarding",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    // Record 10 activities to trigger achievement
    for(let i = 0; i < 10; i++) {
      chain.mineBlock([
        Tx.contractCall('fit_tide', 'record-activity', [
          types.ascii("swimming"),
          types.uint(3600),
          types.uint(2000)
        ], wallet1.address)
      ]);
    }
    
    // Check achievement badge was minted
    const asset = chain.getAssetsMaps().nfts['fit_tide.achievement-badge'][wallet1.address];
    assertEquals(asset, types.uint(1));
  },
});