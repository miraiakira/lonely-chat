'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export const WalletModalButton = () => {
  const { wallets, select, connected, connecting, publicKey, disconnect } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  const handleWalletSelect = (walletName: WalletName) => {
    select(walletName);
    setModalOpen(false);
  };

  if (connected) {
    return (
      <div className="flex items-center space-x-2">
        <Button variant="outline" disabled>
          {publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : ''}
        </Button>
        <Button variant="destructive" onClick={() => disconnect()}>Disconnect</Button>
      </div>
    );
  }

  return (
    <div>
      <Button onClick={() => setModalOpen(true)} disabled={connecting}>
        {connecting ? 'Connecting...' : 'Select Wallet'}
      </Button>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-background p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Select a wallet</h2>
            <div className="flex flex-col space-y-2">
              {wallets.map((wallet) => (
                <Button
                  key={wallet.adapter.name}
                  onClick={() => handleWalletSelect(wallet.adapter.name)}
                  variant="outline"
                >
                  {wallet.adapter.name}
                </Button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setModalOpen(false)} className="mt-4">Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};