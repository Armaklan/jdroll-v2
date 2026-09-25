import React, {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {campaignsApi} from '../api/campaigns';
import {CampaignSummary} from '../types/campaign';
import {CampaignDetailModal} from './CampaignDetailModal';
import {getUserColorClass} from '../utils/user';
import {BookOpen, ChevronLeft, ChevronRight, Crown, Dice5, Layers, Sparkles,} from 'lucide-react';

const MAX_SLIDES = 6;

type CarouselMode = 'recruiting' | 'active';

interface HomeCampaignCarouselProps {
  onOpenDetail?: (campaign: CampaignSummary) => void;
}

export const HomeCampaignCarousel: React.FC<HomeCampaignCarouselProps> = ({ onOpenDetail }) => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [mode, setMode] = useState<CarouselMode>('recruiting');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadCampaigns = async () => {
      try {
        const all = await campaignsApi.getAllCampaigns(false, '', false);
        if (cancelled) return;

        const recruiting = all.filter(
          (c) => c.isRecrutementOpen && !c.isArchived && c.statut !== 2 && c.statut !== 3
        );

        if (recruiting.length > 0) {
          setCampaigns(recruiting.slice(0, MAX_SLIDES));
          setMode('recruiting');
        } else {
          const active = all.filter((c) => !c.isArchived && c.statut === 0);
          const shuffled = [...active].sort(() => Math.random() - 0.5);
          setCampaigns(shuffled.slice(0, MAX_SLIDES));
          setMode('active');
        }
      } catch {
        // Silently hide the carousel when the API is unavailable
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadCampaigns();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || campaigns.length === 0) {
    return null;
  }

  const scrollBySlide = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.9, behavior: 'smooth' });
  };

  const handleSlideClick = (campaign: CampaignSummary) => {
    if (onOpenDetail) {
      onOpenDetail(campaign);
      return;
    }
    setSelectedCampaign(campaign);
    setIsModalOpen(true);
  };

  const isRecruiting = mode === 'recruiting';

  return (
    <section
      data-testid="home-campaign-carousel"
      className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isRecruiting ? 'Recrutements ouverts' : 'En ce moment sur JdRoll'}</span>
          </div>
          <h2
            data-testid="home-campaign-carousel-title"
            className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
          >
            {isRecruiting
              ? 'Ces tables recrutent'
              : 'Des tables actives à découvrir'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {isRecruiting
              ? 'Ces campagnes cherchent des joueurs : trouvez votre prochaine aventure.'
              : 'Aucune table ne recrute pour le moment, mais ces aventures battent leur plein.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/join-campaign')}
          className="inline-flex items-center gap-1.5 self-start sm:self-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition shadow-sm cursor-pointer"
        >
          <BookOpen className="w-4 h-4" />
          <span>Voir toutes les campagnes</span>
        </button>
      </div>

      <div className="relative">
        <div
          ref={trackRef}
          data-testid="home-campaign-carousel-track"
          className="flex gap-4 [justify-content:safe_center] overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mb-2"
        >
          {campaigns.map((campaign) => {
            return (
              <article
                key={campaign.id}
                data-testid="home-campaign-carousel-slide"
                onClick={() => handleSlideClick(campaign)}
                className="group snap-start shrink-0 w-[280px] bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl overflow-hidden transition-all cursor-pointer flex flex-col"
              >
                <div className="relative h-32 bg-slate-100 overflow-hidden">
                  {campaign.banniere || campaign.banniereForum ? (
                    <img
                      src={campaign.banniere || campaign.banniereForum || undefined}
                      alt={campaign.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 via-slate-100 to-purple-100">
                      <BookOpen className="w-10 h-10 text-indigo-400" />
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col">
                  <h3 className="text-base font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition">
                    {campaign.name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {campaign.systeme && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white text-slate-600 border border-slate-200">
                        <Dice5 className="w-3 h-3 text-indigo-500" />
                        {campaign.systeme}
                      </span>
                    )}
                    {campaign.univers && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-white text-slate-600 border border-slate-200">
                        <Layers className="w-3 h-3 text-purple-500" />
                        {campaign.univers}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto pt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span className={getUserColorClass(campaign.mjProfil)}>
                        {campaign.mjUsername}
                      </span>
                    </span>
                    <span className="font-semibold">
                      {campaign.nbJoueursActuel}/{campaign.nbJoueurs} joueurs
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Campagnes précédentes"
          data-testid="home-campaign-carousel-prev"
          onClick={() => scrollBySlide(-1)}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -ml-4 w-9 h-9 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 shadow-md transition cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          aria-label="Campagnes suivantes"
          data-testid="home-campaign-carousel-next"
          onClick={() => scrollBySlide(1)}
          className="hidden sm:flex absolute right-0 top-1/2 -translate-y-1/2 -mr-4 w-9 h-9 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 shadow-md transition cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onJoinSuccess={(_campaignId, message) => {
          // Keep the success message inside the modal; no extra action needed on the homepage
          void message;
        }}
      />
    </section>
  );
};
