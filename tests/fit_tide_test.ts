import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// [Previous test cases remain unchanged]

Clarinet.test({
  name: "Test activity-specific distance limits",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    // Test swimming distance limit
    let block = chain.mineBlock([
      Tx.contractCall('fit_tide', 'record-activity', [
        types.ascii("swimming"),
        types.uint(3600),
        types.uint(10001) // Exceeds swimming limit
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectErr(types.uint(105));
    
    // Test kayaking distance limit
    block = chain.mineBlock([
      Tx.contractCall('fit_tide', 'record-activity', [
        types.ascii("kayaking"),
        types.uint(3600),
        types.uint(50001) // Exceeds kayaking limit
      ], wallet1.address)
    ]);
    
    block.receipts[0].result.expectErr(types.uint(105));
  },
});

Clarinet.test({
  name: "Test achievement tracking and last achievement ID",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    
    // Record 10 activities
    for(let i = 0; i < 10; i++) {
      chain.mineBlock([
        Tx.contractCall('fit_tide', 'record-activity', [
          types.ascii("swimming"),
          types.uint(3600),
          types.uint(2000)
        ], wallet1.address)
      ]);
    }
    
    // Check last achievement ID
    let achievementBlock = chain.mineBlock([
      Tx.contractCall('fit_tide', 'get-last-achievement', [], wallet1.address)
    ]);
    
    achievementBlock.receipts[0].result.expectOk().expectUint(1);
  },
});
