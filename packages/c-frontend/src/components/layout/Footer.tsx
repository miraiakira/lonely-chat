'use client';

import Link from 'next/link';
import { Heart, Github, Twitter, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: '功能介绍', href: '/features' },
      { name: '定价方案', href: '/pricing' },
      { name: '更新日志', href: '/changelog' },
      { name: 'API 文档', href: '/api-docs' },
    ],
    support: [
      { name: '帮助中心', href: '/help' },
      { name: '联系我们', href: '/contact' },
      { name: '反馈建议', href: '/feedback' },
      { name: '状态页面', href: '/status' },
    ],
    legal: [
      { name: '服务条款', href: '/terms' },
      { name: '隐私政策', href: '/privacy' },
      { name: '社区规范', href: '/community-guidelines' },
      { name: 'Cookie 政策', href: '/cookies' },
    ],
    social: [
      { name: 'GitHub', href: 'https://github.com', icon: Github },
      { name: 'Twitter', href: 'https://twitter.com', icon: Twitter },
      { name: '邮箱', href: 'mailto:contact@example.com', icon: Mail },
    ],
  };

  return (
    <footer className="bg-background border-t">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* 品牌信息 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">LC</span>
                </div>
                <span className="text-xl font-bold">LonelyChat</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                连接世界，分享生活。让每一次对话都充满温度，让每一个瞬间都值得记录。
              </p>
              <div className="flex space-x-4">
                {footerLinks.social.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Icon className="h-5 w-5" />
                      <span className="sr-only">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 产品链接 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">产品</h3>
              <ul className="space-y-3">
                {footerLinks.product.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 支持链接 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">支持</h3>
              <ul className="space-y-3">
                {footerLinks.support.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 法律链接 */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-4">法律</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 底部版权信息 */}
        <div className="border-t py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>© {currentYear} LonelyChat. 保留所有权利。</span>
            </div>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <span>用</span>
              <Heart className="h-4 w-4 text-red-500 fill-current" />
              <span>构建</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}