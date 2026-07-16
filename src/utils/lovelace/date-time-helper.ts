const leftPad = (num: number) => (num < 10 ? `0${num}` : num);

export const createDurationFromMinutes = (mins: string | number) => {
  const totalMinutes = Number(mins);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = Math.floor(totalMinutes % 60);
  return { days, hours, minutes };
};

export const formatDisplayDuration = (lang: string, mins: string | number) => {
  const durationData = createDurationFromMinutes(mins);
  return new Intl.DurationFormat(lang, { style: 'narrow' }).format(durationData);
};

export const formaDisplayDynamicDuration = (lang: string, mins: string | number) => {
  const durationData = createDurationFromMinutes(mins);
  const { days, hours, minutes } = durationData;
  if (days && days > 0) {
    return `${Intl.NumberFormat(lang, {
      style: 'unit',
      unit: 'day',
      unitDisplay: 'short',
    }).format(days)} ${hours}:${leftPad(minutes)}`;
  }
  return new Intl.DurationFormat(lang, { style: 'narrow' }).format(durationData);
};
