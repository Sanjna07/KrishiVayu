'use client';

interface FooterProps {
  lastUpdated?: string;
}

export function Footer({ lastUpdated }: FooterProps) {
  const displayTime = lastUpdated || new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

  return (
    <footer className="bg-white border-t border-[#D9DEE5] text-[#5B6675] text-xs py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        {/* Top Info Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#E5E9F0] pb-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1F3A5F]">KrishiVayu</span>
            <span>·</span>
            <span>Paddy Straw Burn Detection & Ex-situ Off-Take Platform</span>
          </div>

          <div className="text-[11px] text-[#5B6675]">
            <span>Data Refresh: </span>
            <span className="font-mono text-[#1B2430]">{displayTime}</span>
          </div>
        </div>

        {/* Sources & Citations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] leading-relaxed">
          <div>
            <span className="font-semibold text-[#1B2430] block mb-1">Authoritative Data Feeds</span>
            <ul className="list-disc list-inside space-y-0.5">
              <li>NASA EOSDIS FIRMS (SNPP & NOAA-20 VIIRS 375m Near Real-Time Active Fire Detections)</li>
              <li>Open-Meteo European/ECMWF 10m Wind & Atmospheric Vector Model (CC-BY 4.0)</li>
              <li>ICAR-IARI CREAMS Crop Residue Burning Historical Satellite Archives</li>
            </ul>
          </div>
          <div>
            <span className="font-semibold text-[#1B2430] block mb-1">Clean Alternatives & Off-Take</span>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Biomass Pelletizing & Bio-CNG buyback benchmarks (CPCB / PEDA Ex-situ Framework)</li>
              <li>Custom Hiring Centres (CHC) Happy Seeder / Super Seeder agricultural registry</li>
            </ul>
          </div>
        </div>

        {/* Anti-Hallucination & Independent Project Disclaimer */}
        <div className="bg-[#F5F7FA] border border-[#D9DEE5] rounded p-3 text-[11px] text-[#5B6675] text-center">
          <p className="font-semibold text-[#1B2430] mb-0.5">Independent Project Notice</p>
          <p>
            KrishiVayu is an independent civic-tech open data project for air quality mitigation and farmer residue valorization. 
            It is <strong>not an official government service</strong> and does not represent the Government of India or state agricultural departments.
          </p>
        </div>
      </div>
    </footer>
  );
}
