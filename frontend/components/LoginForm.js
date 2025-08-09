import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().min(6).required(),
});

export default function LoginForm({ onSubmit }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm mx-auto p-4 bg-white shadow rounded">
      <h2 className="text-xl font-bold mb-4 text-primary">Login</h2>

      <input
        type="email"
        placeholder="Email"
        {...register('email')}
        className="w-full mb-2 p-2 border rounded"
      />
      <p className="text-red-500 text-sm">{errors.email?.message}</p>

      <input
        type="password"
        placeholder="Password"
        {...register('password')}
        className="w-full mb-2 p-2 border rounded"
      />
      <p className="text-red-500 text-sm">{errors.password?.message}</p>

      <button type="submit" className="bg-primary text-white px-4 py-2 rounded w-full">Login</button>
    </form>
  );
}