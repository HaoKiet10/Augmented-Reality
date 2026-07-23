/**
 * URL gốc của backend API.
 * - Local dev: không set VITE_API_URL -> mặc định http://localhost:3000.
 * - Deploy: set biến môi trường VITE_API_URL (VD trên Vercel/Netlify) trỏ tới URL backend đã deploy.
 */
export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:3000';
