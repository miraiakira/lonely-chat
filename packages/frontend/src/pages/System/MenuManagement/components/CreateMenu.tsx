import { createMenu, getMenuTree } from '@/services/api';
import { PlusOutlined } from '@ant-design/icons';
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProFormCascader,
} from '@ant-design/pro-components';
import { Button, Form, App as AntdApp } from 'antd';
import React from 'react';
import type { MenuItem } from '@/types';

interface CreateMenuProps {
  onSuccess: () => void;
}

interface FormValues {
  title: string;
  i18nKey?: string;
  path: string;
  component?: string;
  icon?: string;
  order?: number;
  parentPath?: number[]; // 通过级联选择器选择的路径（每级的 id）
  isExternal?: boolean;
  externalUrl?: string;
  hidden?: boolean;
  permissions?: string[];
}

const CreateMenu: React.FC<CreateMenuProps> = (props) => {
  const [form] = Form.useForm<FormValues>();
  const { message } = AntdApp.useApp();
  const [options, setOptions] = React.useState<any[]>([]);

  const buildOptions = (menus: MenuItem[] | undefined): any[] => {
    if (!menus || menus.length === 0) return [];
    return menus.map((m) => ({
      value: m.id,
      label: m.title, // 不显示 ID
      children: buildOptions(m.children),
    }));
  };

  const loadTree = async () => {
    try {
      const menus = await getMenuTree();
      setOptions(buildOptions(menus as MenuItem[]));
    } catch (e) {
      setOptions([]);
    }
  };

  return (
    <ModalForm<FormValues>
      title="新建菜单"
      trigger={
        <Button type="primary">
          <PlusOutlined />
          新建菜单
        </Button>
      }
      form={form}
      autoFocusFirstInput
      modalProps={{
        destroyOnClose: true,
        onCancel: () => console.log('run'),
      }}
      submitTimeout={2000}
      onOpenChange={(open) => {
        if (open) {
          loadTree();
          form.setFieldsValue({ parentPath: undefined, isExternal: false, hidden: false });
        }
      }}
      onFinish={async (values: FormValues) => {
        try {
          // 从级联选择器的路径计算 parentId，并校验层级不超过 3
          let parentId: number | null = null;
          let parentLevel = 0;
          if (Array.isArray(values.parentPath) && values.parentPath.length > 0) {
            parentId = values.parentPath[values.parentPath.length - 1] as number;
            parentLevel = values.parentPath.length;
          }
          const newLevel = parentLevel + 1; // 新建菜单的层级
          if (newLevel > 3) {
            message.error('菜单最多 3 级，无法在第三级下继续新增');
            return false;
          }

          const payload: any = {
            title: values.title,
            i18nKey: values.i18nKey,
            path: values.path,
            component: values.component,
            icon: values.icon,
            order: values.order,
            parentId,
            isExternal: values.isExternal ?? false,
            externalUrl: values.externalUrl,
            hidden: values.hidden ?? false,
          };

          // permissions 字段由 ProFormTextArea 的 transform 处理合并到 values 中，如果已经存在则带上
          if ((values as any).permissions) {
            payload.permissions = (values as any).permissions;
          }

          await createMenu(payload);
          message.success('提交成功');
          props.onSuccess();
          return true;
        } catch (error) {
          message.error('提交失败');
          return false;
        }
      }}
    >
      <ProForm.Group>
        <ProFormText
          width="md"
          name="title"
          label="菜单名称"
          tooltip="最长为 24 位"
          placeholder="请输入名称"
          rules={[{ required: true, message: '请输入菜单名称' }]}
        />

        <ProFormText
          width="md"
          name="path"
          label="菜单路径"
          placeholder="请输入路径"
          rules={[{ required: true, message: '请输入菜单路径' }]}
        />
      </ProForm.Group>
      <ProForm.Group>
        <ProFormText
          width="md"
          name="component"
          label="组件路径"
          placeholder="(可选) 请输入组件路径"
        />
        <ProFormText
          width="md"
          name="icon"
          label="菜单图标"
          placeholder="请输入图标"
        />
      </ProForm.Group>
      <ProForm.Group>
        <ProFormDigit name="order" label="排序" />
        <ProFormCascader
          name="parentPath"
          label="父级菜单"
          placeholder="不选择则为顶级"
          fieldProps={{
            options,
            changeOnSelect: true, // 每一级都可以选择
            expandTrigger: 'hover',
            showSearch: {
              filter: (inputValue, path) =>
                path.some((opt) => String(opt.label).toLowerCase().includes(String(inputValue).toLowerCase())),
            },
          }}
          allowClear
        />
      </ProForm.Group>
      <ProForm.Group>
        <ProFormText
          width="md"
          name="i18nKey"
          label="多语言键"
          placeholder="(可选) 请输入 i18n key，例如 menu.dashboard"
        />
        <ProFormRadio.Group
          name="hidden"
          label="是否隐藏"
          options={[
            { label: '否', value: false },
            { label: '是', value: true },
          ]}
          initialValue={false}
        />
      </ProForm.Group>
      <ProForm.Group>
        <ProFormRadio.Group
          name="isExternal"
          label="是否外链"
          options={[
            {
              label: '是',
              value: true,
            },
            {
              label: '否',
              value: false,
            },
          ]}
          initialValue={false}
        />
        <ProFormText
          width="md"
          name="externalUrl"
          label="外链地址"
          placeholder="(可选) 请输入外链 URL"
        />
      </ProForm.Group>
      <ProFormTextArea
        name="permissions"
        label="权限（逗号分隔）"
        placeholder="例如：user:read, user:write"
        transform={(value: string) =>
          typeof value === 'string' && value.length > 0
            ? { permissions: value.split(',').map((s) => s.trim()).filter(Boolean) }
            : { permissions: [] }
        }
      />
    </ModalForm>
  );
};

export default CreateMenu;