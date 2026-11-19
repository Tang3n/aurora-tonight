import type { Strings } from '@aurora/core/i18n';

export function Footer({ S }: { S: Strings }) {
  return (
    <footer>
      <span>
        {S.sources}: <a href="https://www.swpc.noaa.gov/">NOAA SWPC</a> · <a href="https://api.met.no/">MET Norway</a> ·{' '}
        <a href="https://open-meteo.com/">Open-Meteo</a>
      </span>
      <span>{S.disclaimer}</span>
      <span>
        <a href="https://tang3n.github.io/portfolio/">Štěpán Mészáros</a> · <a href="https://github.com/Tang3n/aurora-tonight">GitHub</a>
      </span>
    </footer>
  );
}
