'use client';

import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Camera, Save } from 'lucide-react';
import { uploadFile } from '@/lib/upload.api';
import { updateUserProfile, type UpdateUserProfileData, type User } from '@/lib/user.api';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/user';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3030/api";

const getAvatarUrl = (avatar?: string | null) => {
  if (!avatar) return undefined;
  if (avatar.startsWith("http")) return avatar;
  return `${apiBase}/uploads/${avatar}`;
};

interface UserProfileEditProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updatedUser: User) => void;
}

export default function UserProfileEdit({ user, open, onOpenChange, onSave }: UserProfileEditProps) {
  const { setUser: setAuthUser } = useAuth()
  const setUserInStore = useUserStore((s) => s.setUser)
  const [formData, setFormData] = useState<UpdateUserProfileData>({
    nickname: user.profile?.nickname || '',
    avatar: user.profile?.avatar || '',
    gender: user.profile?.gender || '',
    bio: user.profile?.bio || '',
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await uploadFile(file);
      setFormData(prev => ({ ...prev, avatar: result.url }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('头像上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleInputChange = (field: keyof UpdateUserProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedUser = await updateUserProfile(formData);
      onSave(updatedUser);
      try { setAuthUser(updatedUser) } catch {}
      try { setUserInStore(updatedUser) } catch {}
      onOpenChange(false);
    } catch (error) {
      console.error('Save failed:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // 重置表单数据
    setFormData({
      nickname: user.profile?.nickname || '',
      avatar: user.profile?.avatar || '',
      gender: user.profile?.gender || '',
      bio: user.profile?.bio || '',
    });
    onOpenChange(false);
  };

  const avatarUrl = getAvatarUrl(formData.avatar);
  const hasAvatar = !!avatarUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[800px] flex flex-col items-center'>
        <DialogHeader className='w-full'>
          <DialogTitle>
            编辑个人信息
          </DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <div className="p-6 space-y-6 w-[600px] flex flex-col items-center">
          {/* 头像编辑 */}
          <div className="flex flex-col items-center w-full space-y-4">
            <div className="group relative h-24 w-24 rounded-full overflow-hidden">
              <Avatar className="h-full w-full cursor-pointer" onClick={handleAvatarClick}>
                {hasAvatar ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={formData.nickname || user.username}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AvatarFallback className="h-full w-full text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {(formData.nickname || user.username)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div
                className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                onClick={handleAvatarClick}
              >
                {uploading ? (
                  <div className="text-white text-xs animate-pulse">上传中...</div>
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">点击头像更换图片</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 表单字段 */}
          <div className="grid gap-4 w-full">
            <div className="space-y-2">
              <Label htmlFor="nickname">昵称</Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => handleInputChange('nickname', e.target.value)}
                placeholder="请输入昵称"
                className="transition-all duration-200 focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">性别</Label>
              <Input
                id="gender"
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value)}
                placeholder="请输入性别（如：男、女）"
                className="transition-all duration-200 focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">个人简介</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="介绍一下自己吧..."
                rows={3}
                className="transition-all duration-200 focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t w-full border-border">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving}
              className="transition-all duration-200 hover:scale-105"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="transition-all duration-200 hover:scale-105"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}