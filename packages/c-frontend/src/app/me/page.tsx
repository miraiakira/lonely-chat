'use client';

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from '@solana/web3.js';
import { getRewardsSummary, checkin, claimTokens } from "../../lib/rewards.api";
import { fetchMe } from "../../lib/apiClient";
import type { RewardsSummary } from "../../lib/rewards.api";
import { WalletModalButton } from '@/components/Wallet/WalletModalButton';
import { Gift, Coins, CheckCircle, HelpCircle, Edit } from 'lucide-react';
import UserProfileEdit from '@/components/UserProfileEdit';
import type { User } from '@/lib/user.api';

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
  const [user, setUser] = useState<User | null>(null);
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinError, setCheckinError] = useState("");

  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [userRes, rewardsRes] = await Promise.all([
          fetchMe(),
          getRewardsSummary(),
        ]);
        setUser(userRes);
        setRewards(rewardsRes);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    }
    fetchData();
  }, []);

  const doCheckin = async () => {
    setCheckingIn(true);
    setCheckinError("");
    try {
      await checkin();
      // Refresh rewards summary after successful checkin
      const updatedRewards = await getRewardsSummary();
      setRewards(updatedRewards);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setCheckinError(`签到失败: ${errorMessage}`);
    } finally {
      setCheckingIn(false);
    }
  };

  const doClaim = async () => {
    if (!publicKey || !signTransaction) {
      setClaimMsg("请先连接钱包");
      return;
    }

    setClaiming(true);
    setClaimMsg("");
    try {
      const result = await claimTokens({
        chain: 'solana',
        wallet: publicKey.toString(),
      });
      if (result.status === 'done') {
        setClaimMsg(`领取成功！交易 ID: ${result.tx}`);
        // Refresh rewards summary after successful claim
        getRewardsSummary().then(setRewards);
      } else {
        setClaimMsg(`领取请求已提交，状态: ${result.status}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setClaimMsg(`领取失败: ${errorMessage}`);
    } finally {
      setClaiming(false);
    }
  };

  const handleEditSave = (updatedUser: User) => {
    setUser(updatedUser);
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

  const userAvatar = getAvatarUrl(user?.profile?.avatar);
  const hasUserAvatar = !!userAvatar;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center space-x-4">
              <Avatar className="h-20 w-20">
                {hasUserAvatar ? (
                  <AvatarImage
                    src={userAvatar}
                    alt={user.profile?.nickname || user.username}
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-semibold">
                    {(user.profile?.nickname || user.username)?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h1 className="">{user.profile?.nickname || user.username}</h1>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="ml-2 transition-all duration-200 hover:scale-105"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    编辑
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{user.profile?.bio || '暂无个人简介'}</p>
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

      {/* 编辑个人信息弹框 */}
      <UserProfileEdit
        user={user}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleEditSave}
      />
    </div>
  );
}