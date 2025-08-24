export class DateUtils {
    static formatToIST(utcDate) {
        if (!utcDate) return 'N/A';
        const date = new Date(utcDate);
        return date.toLocaleString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }) + ' IST';
    }

    /**
     * Convert UTC to IST datetime-local format
     */
    static toISTDateTimeLocal(utcDate) {
        if (!utcDate) return '';
        const date = new Date(utcDate);
        const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000)); // Add 5:30 for IST
        return istDate.toISOString().slice(0, 16);
    }

    static nowISTDateTimeLocal() {
        const now = new Date();
        const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        return istNow.toISOString().slice(0, 16);
    }
}