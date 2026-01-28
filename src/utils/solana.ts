import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createCloseAccountInstruction, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

export function getConnection(url: string) {
  return new Connection(url, 'confirmed');
}

export function loadKeypairFromFile(filePath: string): Keypair {
  const raw = fs.readFileSync(filePath, 'utf8');
  const arr = JSON.parse(raw) as number[];
  return Keypair.fromSecretKey(Buffer.from(arr));
}

export async function getBalance(connection: Connection, pubkey: PublicKey) {
  const lamports = await connection.getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}

export function lamportsToSol(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(9);
}

export async function closeTokenAccount(
  connection: Connection, 
  accountPubkey: PublicKey, 
  payerKeypair: Keypair
): Promise<{ success: boolean; message: string; lamportsRecovered?: number; signature?: string }> {
  try {
    // Get account info to verify it's a token account
    const accountInfo = await getAccount(connection, accountPubkey);
    
    // Verify the account is owned by the payer (can only close accounts you own)
    if (!accountInfo.owner.equals(payerKeypair.publicKey)) {
      return { 
        success: false, 
        message: `Cannot close account: owner ${accountInfo.owner.toBase58()} != payer ${payerKeypair.publicKey.toBase58()}` 
      };
    }

    // Get balance before closing (this is the rent that will be recovered)
    const balanceBefore = await connection.getBalance(accountPubkey);
    
    // Create close account instruction
    const closeInstruction = createCloseAccountInstruction(
      accountPubkey,    
      payerKeypair.publicKey,  
      payerKeypair.publicKey,  
      [],               
      TOKEN_PROGRAM_ID  
    );

    // Create and send transaction
    const transaction = new Transaction().add(closeInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payerKeypair.publicKey;

    // Sign and send transaction
    const signature = await sendAndConfirmTransaction(connection, transaction, [payerKeypair]);

    const lamportsRecovered = balanceBefore;

    return { 
      success: true, 
      message: `Successfully closed account ${accountPubkey.toBase58()}`, 
      lamportsRecovered,
      signature 
    };

  } catch (error: any) {
    console.error("Error closing account:", error);
    return { 
      success: false, 
      message: `Failed to close account: ${error.message}` 
    };
  }
}
