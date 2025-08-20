import { createMenu } from '@/services/api';
import { PlusOutlined } from '@ant-design/icons';
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
} from '@ant-design/pro-components';
import { Button, Form, message } from 'antd';

interface CreateMenuProps {
  onSuccess: () => void;
}

interface FormValues {
  name: string;
  path: string;
  component: string;
  icon: string;
  order: number;
  isExt: boolean;
}

const CreateMenu: React.FC<CreateMenuProps> = (props) => {
  const [form] = Form.useForm<FormValues>();
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
      onFinish={async (values: FormValues) => {
        try {
          await createMenu(values);
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
          name="name"
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
          placeholder="请输入组件路径"
          rules={[{ required: true, message: '请输入组件路径' }]}
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
      </ProForm.Group>
      <ProFormRadio.Group
        name="isExt"
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
      />
    </ModalForm>
  );
};

export default CreateMenu;