import { user } from '$store/user';

if (typeof localStorage !== 'undefined') {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            const parsedUser = JSON.parse(storedUser);
            user.set(parsedUser);
        } catch (error) {
            console.error('Error parsing user from localStorage:', error);
            localStorage.removeItem('user'); // Clear invalid data
        }
    }
}