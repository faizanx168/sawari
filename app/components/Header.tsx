/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useCallback, memo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import type { Session } from 'next-auth';
import { Menu, X, MapPin, Car, Bell, Calendar, Clock } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { Notification, User } from '../types/notifications';
import Image from 'next/image';

const NotificationItem = memo(function NotificationItem({ 
  notification,     
  onMarkAsRead 
}: { 
  notification: Notification; 
  onMarkAsRead: (id: string) => void;     
}) {
  return (
    <div 
      className={`p-4 border-b ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <p className="text-sm">{notification.message}</p>
      <p className="text-xs text-gray-500 mt-1">
        {new Date(notification.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
});

const UserMenu = memo(function UserMenu({ 
  isOpen, 
  onClose,
  session
}: { 
  isOpen: boolean; 
  onClose: () => void;
  session: Session | null;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div ref={menuRef} className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
      <div className="py-1">
        <Link
          href="/my-rides"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          My Rides
        </Link>
        <Link
          href="/my-cars"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          My Cars
        </Link>
        <Link
          href="/driver-dashboard"
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Driver Dashboard
        </Link>
        <Link
          href={`/profile/${session?.user?.id}`}
          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Profile
        </Link>
        <button
          onClick={() => {
            onClose();
            signOut();
          }}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Sign out
        </button>
      </div>
    </div>
  );
});

export default function Header() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  
  const { notifications, unreadCount, isLoading, markAsRead } = useNotifications();

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);

  const toggleUserMenu = useCallback(() => {
    setIsUserMenuOpen(prev => !prev);
  }, []);

  const toggleNotificationMenu = useCallback(() => {
    setIsNotificationMenuOpen(prev => !prev);
  }, []);

  const handleMarkAsRead = useCallback((id: string) => {
    markAsRead(id);
  }, [markAsRead]);

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and main navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Sawari
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/find-rides"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
              >
                <MapPin className="h-5 w-5 mr-1" />
                Find Rides
              </Link>
              <Link
                href="/create-ride"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
              >
                <Car className="h-5 w-5 mr-1" />
                Offer Ride
              </Link>
              <Link
                href="/my-bookings"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
              >
                <Calendar className="h-5 w-5 mr-1" />
                My Bookings
              </Link>
              <Link
                href="/pending-bookings"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600"
              >
                <Clock className="h-5 w-5 mr-1" />
                Pending Bookings
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-blue-600"
              >
                About
              </Link>
            </div>
          </div>

          {/* Right side menu */}
          <div className="flex items-center">
            {session?.user ? (
              <>
                <div className="relative ml-3">
                  <button
                    onClick={toggleNotificationMenu}
                    className="p-2 text-gray-600 hover:text-blue-600 relative"
                  >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {isNotificationMenuOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50">
                      <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                          <div className="p-4 text-center text-gray-500">Loading...</div>
                        ) : notifications.length === 0 ? (
                          <div className="p-4 text-center text-gray-500">No notifications</div>
                        ) : (
                          notifications.map((notification: Notification) => (
                            <NotificationItem
                              key={notification.id}
                              notification={notification}
                              onMarkAsRead={handleMarkAsRead}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative ml-3">
                  <button
                    onClick={toggleUserMenu}
                    className="flex items-center text-sm rounded-full focus:outline-none"
                  >
                    <Image
                      className="h-8 w-8 rounded-full"
                      src={session.user.image || '/default-avatar.png'}
                      alt={session.user.name || 'User avatar'}
                      width={32}
                      height={32}
                    />
                  </button>
                  <UserMenu
                    isOpen={isUserMenuOpen}
                    onClose={() => setIsUserMenuOpen(false)}
                    session={session}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-900 hover:text-blue-600"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              href="/find-rides"
              className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              onClick={() => setIsMenuOpen(false)}
            >
              Find Rides
            </Link>
            <Link
              href="/create-ride"
              className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              onClick={() => setIsMenuOpen(false)}
            >
              Offer Ride
            </Link>
            <Link
              href="/my-cars"
              className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              onClick={() => setIsMenuOpen(false)}
            >
              Cars
            </Link>
            <Link
              href="/driver-dashboard"
              className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              onClick={() => setIsMenuOpen(false)}
            >
              Driver Dashboard
            </Link>
            <Link
              href={`/profile/${session?.user?.id}`}
              className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              onClick={() => setIsMenuOpen(false)}
            >
              Profile
            </Link>
            <Link
              href="/my-bookings"
              className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              onClick={() => setIsMenuOpen(false)}
            >
              My Bookings
            </Link>
            <Link
              href="/pending-bookings"
              className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              onClick={() => setIsMenuOpen(false)}
            >
              Pending Bookings
            </Link>
            <Link
              href="/about"
              className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            {session ? (
              <button
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              >
                Sign out
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}