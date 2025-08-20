import { Button, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
const Login = () => {
    const navigate = useNavigate();
    const onFinish = async (values) => {
        try {
            const response = await apiClient.post('/auth/login', values);
            const { token } = response.data;
            localStorage.setItem('token', token);
            navigate('/dashboard');
        }
        catch (error) {
            console.error('Login failed:', error);
            message.error('Login failed. Please check your credentials.');
        }
    };
    return (<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Form name="basic" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} style={{ maxWidth: 600 }} initialValues={{ remember: true }} onFinish={onFinish} autoComplete="off">
        <Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please input your username!' }]}>
          <Input />
        </Form.Item>

        <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Please input your password!' }]}>
          <Input.Password />
        </Form.Item>

        <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
          <Button type="primary" htmlType="submit">
            Submit
          </Button>
        </Form.Item>
      </Form>
    </div>);
};
export default Login;
//# sourceMappingURL=index.js.map