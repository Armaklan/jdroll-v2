import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  Minus,
  RemoveFormatting,
  Code,
  MessageCircle,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  value,
  onChange,
  placeholder = 'Rédigez votre message ici...',
  disabled = false,
  minHeight = '180px',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isSourceMode, setIsSourceMode] = useState<boolean>(false);
  const isUpdatingFromProp = useRef<boolean>(false);

  // Synchronise le contenu externe avec le contentEditable quand ce n'est pas l'utilisateur qui tape
  useEffect(() => {
    if (editorRef.current && !isSourceMode) {
      if (editorRef.current.innerHTML !== value) {
        isUpdatingFromProp.current = true;
        editorRef.current.innerHTML = value || '';
        isUpdatingFromProp.current = false;
      }
    }
  }, [value, isSourceMode]);

  const handleInput = () => {
    if (isUpdatingFromProp.current) return;
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      // Si l'éditeur ne contient qu'une balise vide <br> ou rien
      if (html === '<br>' || html === '<p><br></p>') {
        onChange('');
      } else {
        onChange(html);
      }
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    if (disabled || isSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput();
  };

  const handleInsertLink = () => {
    if (disabled || isSourceMode) return;
    const url = window.prompt("Entrez l'adresse URL du lien (ex: https://example.com) :");
    if (url && url.trim()) {
      executeCommand('createLink', url.trim());
    }
  };

  const wrapSelectionWithClass = (className: string) => {
    if (disabled || isSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = className;

    if (!range.collapsed) {
      const fragment = range.extractContents();
      span.appendChild(fragment);
    } else {
      span.innerHTML = '&nbsp;';
    }

    range.insertNode(span);

    // Repositionne le curseur après le span
    range.setStartAfter(span);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    handleInput();
  };

  return (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition">
      {/* Barre d'outils WYSIWYG */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-700 select-none">
        {/* Formatage basique */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            disabled={disabled || isSourceMode}
            title="Gras (Ctrl+B)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            disabled={disabled || isSourceMode}
            title="Italique (Ctrl+I)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            disabled={disabled || isSourceMode}
            title="Souligné (Ctrl+U)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('strikeThrough')}
            disabled={disabled || isSourceMode}
            title="Barré"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition"
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Blocs et structure */}
        <div className="flex items-center gap-0.5 px-1 border-r border-slate-200">
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h3>')}
            disabled={disabled || isSourceMode}
            title="Titre de section"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition"
          >
            <Heading className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<blockquote>')}
            disabled={disabled || isSourceMode}
            title="Citation"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            disabled={disabled || isSourceMode}
            title="Liste à puces"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            disabled={disabled || isSourceMode}
            title="Liste numérotée"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleInsertLink}
            disabled={disabled || isSourceMode}
            title="Insérer un lien"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertHorizontalRule')}
            disabled={disabled || isSourceMode}
            title="Ligne de séparation"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Styles rôlistes (RP) */}
        <div className="flex items-center gap-1 px-1 border-r border-slate-200">
          <button
            type="button"
            onClick={() => wrapSelectionWithClass('dialogue')}
            disabled={disabled || isSourceMode}
            title="Dialogue (<span class='dialogue'>)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 transition"
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: 'var(--dialogue-color, #4488CC)' }}
            />
            <MessageCircle className="w-3.5 h-3.5" style={{ color: 'var(--dialogue-color, #4488CC)' }} />
            <span className="hidden sm:inline">Dialogue</span>
          </button>
          <button
            type="button"
            onClick={() => wrapSelectionWithClass('pensee')}
            disabled={disabled || isSourceMode}
            title="Pensée (<span class='pensee'>)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 transition"
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: 'var(--pensee-color, #8844CC)' }}
            />
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--pensee-color, #8844CC)' }} />
            <span className="hidden sm:inline">Pensée</span>
          </button>
          <button
            type="button"
            onClick={() => wrapSelectionWithClass('rp1')}
            disabled={disabled || isSourceMode}
            title="RP 1 (<span class='rp1'>)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 transition"
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: 'var(--rp1-color, #ff6600)' }}
            />
            <span className="font-bold text-xs" style={{ color: 'var(--rp1-color, #ff6600)' }}>
              RP1
            </span>
          </button>
          <button
            type="button"
            onClick={() => wrapSelectionWithClass('rp2')}
            disabled={disabled || isSourceMode}
            title="RP 2 / RPG 2 (<span class='rp2'>)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 transition"
          >
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: 'var(--rp2-color, #5EFF6C)' }}
            />
            <span className="font-bold text-xs" style={{ color: 'var(--rp2-color, #5EFF6C)' }}>
              RP2
            </span>
          </button>
          <button
            type="button"
            onClick={() => wrapSelectionWithClass('hrp')}
            disabled={disabled || isSourceMode}
            title="Commentaire Hors-Roleplay (<span class='hrp'>)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-600 text-xs font-medium disabled:opacity-40 transition"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">HRP</span>
          </button>
        </div>

        {/* Nettoyage & Source */}
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            type="button"
            onClick={() => executeCommand('removeFormat')}
            disabled={disabled || isSourceMode}
            title="Effacer le style / mise en forme"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-40 transition"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsSourceMode(!isSourceMode)}
            disabled={disabled}
            title={isSourceMode ? 'Revenir au mode Visuel' : 'Afficher le code source HTML'}
            className={`p-1.5 rounded-lg transition ${
              isSourceMode
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zone d'édition */}
      {isSourceMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Code HTML brut..."
          style={{ minHeight }}
          className="w-full p-4 font-mono text-xs bg-slate-900 text-slate-100 focus:outline-none resize-y"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onBlur={handleInput}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className={`p-4 text-sm sm:text-base text-slate-900 focus:outline-none overflow-y-auto leading-relaxed prose prose-slate max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none ${
            disabled ? 'bg-slate-50 cursor-not-allowed opacity-60' : ''
          }`}
        />
      )}
    </div>
  );
};
