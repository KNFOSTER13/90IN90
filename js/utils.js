// js/utils.js
// Contains reusable helper functions.
import { START_DATE, TOTAL_DAYS } from './config.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const END_DATE = new Date(START_DATE.getTime() + (TOTAL_DAYS * MS_PER_DAY));

export const getCurrentDay = () => {
    const now = new Date();
    if (now < START_DATE) return 0;
    if (now > END_DATE) return TOTAL_DAYS;
    const startOfDay = d => { const date = new Date(d); date.setHours(0, 0, 0, 0); return date; };
    return Math.floor((startOfDay(now) - startOfDay(START_DATE)) / MS_PER_DAY) + 1;
};

export const escapeHtml = str => str ? new DOMParser().parseFromString(str, 'text/html').body.textContent : '';

export const toJsDate = v => v?.toDate ? v.toDate() : new Date(v);

export const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};
