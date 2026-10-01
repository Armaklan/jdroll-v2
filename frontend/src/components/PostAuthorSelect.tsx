import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronDown, Search, User as UserIcon } from 'lucide-react';
import { CharacterSummary } from '../types/campaign';
import { groupAndFilterPostAuthors } from '../utils/post-author-options';

/**
 * Combobox « Poster en tant que ».
 *
 * Remplace le `<select>` natif : les personnages sont regroupés PNJ
 * (affichés en premier) puis PJ, et une recherche (nom ou concept,
 * insensible à la casse et aux accents) filtre la liste.
 */

interface PostAuthorSelectProps {
  /** Personnage sélectionné, ou null pour poster en tant que soi-même. */
  value: number | null;
  onChange: (persoId: number | null) => void;
  /** Personnages proposés (tous pour un MJ, les siens pour un joueur). */
  characters: CharacterSummary[];
  /** Libellé de l'option « poster en tant que soi-même ». */
  selfLabel: string;
  id?: string;
  disabled?: boolean;
}

interface FlatOption {
  key: string;
  persoId: number | null;
  label: string;
  avatar?: string;
}

export function PostAuthorSelect({
  value,
  onChange,
  characters,
  selfLabel,
  id,
  disabled = false,
}: PostAuthorSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => characters.find((c) => c.id === value) ?? null,
    [characters, value]
  );

  const { pnj, pj } = useMemo(
    () => groupAndFilterPostAuthors(characters, query),
    [characters, query]
  );

  const flatOptions = useMemo<FlatOption[]>(
    () => [
      { key: 'self', persoId: null, label: selfLabel },
      ...pnj.map((c) => ({ key: `pnj-${c.id}`, persoId: c.id, label: formatCharacter(c), avatar: c.avatar })),
      ...pj.map((c) => ({ key: `pj-${c.id}`, persoId: c.id, label: formatCharacter(c), avatar: c.avatar })),
    ],
    [selfLabel, pnj, pj]
  );

  // Fermeture au clic extérieur
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  // Focus sur le champ de recherche à l'ouverture
  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  };

  const selectOption = (option: FlatOption) => {
    onChange(option.persoId);
    close();
  };

  const handleSearchKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flatOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = flatOptions[activeIndex];
      if (option) selectOption(option);
    }
  };

  const renderOption = (option: FlatOption, index: number) => (
    <button
      key={option.key}
      type="button"
      data-testid="post-author-option"
      role="option"
      aria-selected={option.persoId === value}
      onMouseEnter={() => setActiveIndex(index)}
      onClick={() => selectOption(option)}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium cursor-pointer transition ${
        index === activeIndex ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
      } ${option.persoId === value ? 'text-indigo-700 font-semibold' : ''}`}
    >
      {option.avatar ? (
        <img src={option.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
      ) : (
        <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      )}
      <span className="truncate">{option.label}</span>
    </button>
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={id}
        data-testid="post-author-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 hover:border-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {selected?.avatar ? (
          <img src={selected.avatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
        ) : null}
        <span className="max-w-56 truncate">
          {selected ? formatCharacter(selected) : selfLabel}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Personnage utilisé pour poster"
          className="absolute left-0 top-full mt-1 z-50 w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                data-testid="post-author-search"
                aria-label="Rechercher un personnage"
                placeholder="Rechercher un personnage..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleSearchKeyDown}
                className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {renderOption(flatOptions[0], 0)}

            {pnj.length > 0 && (
              <div className="pt-1">
                <div
                  data-testid="post-author-group-pnj"
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                >
                  PNJ
                </div>
                {pnj.map((_, i) => renderOption(flatOptions[1 + i], 1 + i))}
              </div>
            )}

            {pj.length > 0 && (
              <div className="pt-1">
                <div
                  data-testid="post-author-group-pj"
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400"
                >
                  PJ
                </div>
                {pj.map((_, i) => renderOption(flatOptions[1 + pnj.length + i], 1 + pnj.length + i))}
              </div>
            )}

            {pnj.length === 0 && pj.length === 0 && (
              <div className="px-3 py-3 text-xs text-slate-400 italic">Aucun personnage trouvé</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatCharacter(character: CharacterSummary): string {
  return character.concept
    ? `${character.name} (${character.concept})`
    : character.name;
}
