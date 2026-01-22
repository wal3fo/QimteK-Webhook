import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-900/30 text-blue-300 border border-blue-700/50',
  POST: 'bg-green-900/30 text-green-300 border border-green-700/50',
  PUT: 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50',
  PATCH: 'bg-orange-900/30 text-orange-300 border border-orange-700/50',
  DELETE: 'bg-red-900/30 text-red-300 border border-red-700/50',
  HEAD: 'bg-purple-900/30 text-purple-300 border border-purple-700/50',
  OPTIONS: 'bg-indigo-900/30 text-indigo-300 border border-indigo-700/50',
  CONNECT: 'bg-pink-900/30 text-pink-300 border border-pink-700/50',
  TRACE: 'bg-gray-900/30 text-gray-300 border border-gray-700/50',
};

export const METHODS = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'];
