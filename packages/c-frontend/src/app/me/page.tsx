'use client';

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from '@solana/web3.js';
import { getRewardsSummary, checkin, claimTokens } from "../../lib/rewards.api";
import { loginApp, fetchMe } from "../../lib/apiClient";
import type { RewardsSummary } from "../../lib/rewards.api";
import { WalletModalButton } from '@/components/Wallet/WalletModalButton';
import { Gift, Coins, CheckCircle, HelpCircle } from 'lucide-react';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3030/api";

const getAvatarUrl = (avatar?: string | null) => {
  if (!avatar) return undefined
  if (avatar.startsWith("http")) return avatar
  return `${apiBase}/uploads/${avatar}`
}

interface UserProfileData {
  id: string;
  address: string;
  nickname: string;
  avatar: string;
  bio: string;
}

export default function MePage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [user, setUser] = useState<UserProfileData | null>(null);
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinError, setCheckinError] = useState("");

  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        await loginApp({ username: 'superadmin', password: 'password' });
        const [userRes, rewardsRes] = await Promise.all([
          fetchMe(),
          getRewardsSummary(),
        ]);
        setUser(userRes);
        setRewards(rewardsRes);
      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    }
    fetchData();
  }, []);

  const doCheckin = async () => {
    setCheckingIn(true);
    setCheckinError("");
    try {
      const result = await checkin();
      setRewards(prev => ({
        ...prev!,
        ...result,
      }));
    } catch (error: any) {
      setCheckinError(error.message || "签到时发生网络错误。");
    } finally {
      setCheckingIn(false);
    }
  };

  const doClaim = async () => {
    if (!publicKey || !signTransaction) {
      setClaimMsg("请先连接钱包并授权");
      return;
    }
    setClaiming(true);
    setClaimMsg("正在创建交易...");
    try {
      const transaction = new Transaction();
      // The backend doesn't require any specific instructions for now,
      // so we can create an empty transaction.

      setClaimMsg("请在钱包中签名交易...");
      const signedTransaction = await signTransaction(transaction);
      const serializedTransaction = signedTransaction.serialize().toString('base64');

      setClaimMsg("正在提交领取请求...");
      const result = await claimTokens({
        chain: "solana",
        wallet: publicKey.toBase58(),
        tx: serializedTransaction,
      });

      if (result.status === 'done') {
        setClaimMsg(`领取成功！交易 ID: ${result.tx}`);
        // Refresh rewards summary after successful claim
        getRewardsSummary().then(setRewards);
      } else {
        setClaimMsg(`领取请求已提交，状态: ${result.status}`);
      }
    } catch (error: any) {
      setClaimMsg(`领取失败: ${error.message}`);
    } finally {
      setClaiming(false);
    }
  };

  if (!user || !rewards) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  const userAvatar = getAvatarUrl((user as any)?.profile?.avatar);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center space-x-4">
              <Avatar className="h-20 w-20">
                {userAvatar ? (
                  <AvatarImage src={userAvatar} alt={user.nickname} />
                ) : (
                  <AvatarFallback className="bg-muted text-muted-foreground flex items-center justify-center text-3xl font-semibold">
                    {user.nickname?.charAt(0).toUpperCase() || 'S'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold">{user.nickname}</h1>
                <p className="text-sm text-muted-foreground">{user.bio}</p>
                <p className="text-xs text-muted-foreground">ID: {user.id}</p>
              </div>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Coins className="h-5 w-5" />
                <span>我的资产</span>
              </CardTitle>
              <CardDescription>连接钱包后查看你在链上的资产</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <HelpCircle className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">暂无数据显示</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Gift className="h-5 w-5" />
                <span>每日签到领币</span>
              </CardTitle>
              <CardDescription>连续签到可获得更多积分奖励</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">今日可领</p>
                  <p className="text-2xl font-bold">{rewards.todayPoints}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">连续签到</p>
                  <p className="text-2xl font-bold">{rewards.streak} <span className="text-sm font-normal">天</span></p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">累计积分</p>
                  <p className="text-2xl font-bold">{rewards.totalPoints}</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <Button onClick={doCheckin} disabled={checkingIn || rewards.todayChecked} size="lg" className="w-full">
                  {rewards.todayChecked ? (
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span>今日已签到</span>
                    </div>
                  ) : (checkingIn ? "签到中..." : "立即签到")}
                </Button>
                {checkinError && <div className="text-xs text-destructive text-center">{checkinError}</div>}
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <WalletModalButton />
                  <Button variant="outline" className="flex-1" onClick={doClaim} disabled={claiming || !publicKey}>
                    {claiming ? "领取中..." : "领取所有代币"}
                  </Button>
                </div>
                {claimMsg ? <div className="text-xs text-muted-foreground text-center">{claimMsg}</div> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}