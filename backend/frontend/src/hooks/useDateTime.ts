import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { 
  formatDate as formatDateUtil, 
  formatTime as formatTimeUtil, 
  formatDateTime as formatDateTimeUtil,
  formatRelativeTime as formatRelativeTimeUtil,
  formatTimestamp as formatTimestampUtil
} from '@/utils/dateTimeFormatter';

export function useDateTime() {
  const settings = useSelector((state: RootState) => state.dateTime.settings);

  const formatDate = (date: Date | string | null) => {
    return formatDateUtil(date, settings);
  };

  const formatTime = (date: Date | string | null) => {
    return formatTimeUtil(date, settings);
  };

  const formatDateTime = (date: Date | string | null) => {
    return formatDateTimeUtil(date, settings);
  };

  const formatTimestamp = (date: Date | string | null) => {
    return formatTimestampUtil(date, settings);
  };

  const formatRelativeTime = (date: Date | string | null) => {
    return formatRelativeTimeUtil(date);
  };

  return {
    settings,
    formatDate,
    formatTime,
    formatDateTime,
    formatTimestamp,
    formatRelativeTime
  };
}
