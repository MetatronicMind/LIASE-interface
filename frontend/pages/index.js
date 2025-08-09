import LoginForm from '../components/LoginForm';
import { useDispatch } from 'react-redux';
import { login } from '../redux/slices/authSlice';

export default function Home() {
  const dispatch = useDispatch();

  const handleLogin = (data) => {
    dispatch(login({ user: { email: data.email }, token: 'dummy-token' }));
    alert("Logged in!");
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-blue-50">
      <LoginForm onSubmit={handleLogin} />
    </main>
  );
}