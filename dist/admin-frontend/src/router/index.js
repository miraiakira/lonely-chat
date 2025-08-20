import { useRoutes, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
const routes = [
    {
        path: '/login',
        element: <Login />
    },
    {
        path: '/dashboard',
        element: <Dashboard />
    },
    {
        path: '*',
        element: <Navigate to="/dashboard"/>,
    },
];
const Router = () => {
    return useRoutes(routes);
};
export default Router;
//# sourceMappingURL=index.js.map