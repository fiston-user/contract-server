import { useQuery } from 'react-query';
import axios from 'axios';

const fetchUser = async () => {
  const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/auth/current-user`, {
    withCredentials: true,
  });
  return response.data;
};

export function useAuth() {
  return useQuery('user', fetchUser, {
    retry: false,
    refetchOnWindowFocus: false,
  });
}