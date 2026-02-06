"use client";

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setDateTimeSettings } from '@/redux/slices/dateTimeSlice';
import { getDateTimeSettings } from '@/utils/dateTimeFormatter';

export default function DateTimeInitializer() {
  const dispatch = useDispatch();

  useEffect(() => {
    // Load settings from localStorage on mount
    const settings = getDateTimeSettings();
    dispatch(setDateTimeSettings(settings));
  }, [dispatch]);

  return null;
}
