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
  Image as ImageIcon,
  Minus,
  RemoveFormatting,
  Code,
  MessageCircle,
  Sparkles,
  HelpCircle,
  Upload,
  X,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  onUploadImage?: (file: File) => Promise<string>;
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  value,
  onChange,
  placeholder = 'Rédigez votre message ici...',
  disabled = false,
  minHeight = '180px',
  onUploadImage,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSourceMode, setIsSourceMode] = useState<boolean>(false);
  const isUpdatingFromProp = useRef<boolean>(false);

  // Drag & drop state for images
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Image Modal state
  const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
  const [imageModalMode, setImageModalMode] = useState<'upload' | 'url'>('upload');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [isModalDragging, setIsModalDragging] = useState<boolean>(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const [modalSelectedFile, setModalSelectedFile] = useState<File | null>(null);
  const [modalPreviewUrl, setModalPreviewUrl] = useState<string | null>(null);

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

  const insertImageAtCursor = (url: string, alt: string = 'Image') => {
    if (disabled || isSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }

    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    img.className = 'rounded-xl max-w-full my-2 inline-block shadow-xs border border-slate-200';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);

      range.setStartAfter(img);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (editorRef.current) {
      editorRef.current.appendChild(img);
      const br = document.createElement('p');
      br.innerHTML = '<br>';
      editorRef.current.appendChild(br);
    }

    handleInput();
  };

  const handleProcessImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Le fichier déposé doit être une image (PNG, JPG, WebP, GIF, SVG, AVIF).');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      if (onUploadImage) {
        const uploadedUrl = await onUploadImage(file);
        insertImageAtCursor(uploadedUrl, file.name);
      } else {
        // Fallback: lecture en DataURL
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (result) {
            insertImageAtCursor(result, file.name);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      setUploadError(err.message || "Erreur lors de l'envoi de l'image.");
    } finally {
      setIsUploading(false);
    }
  };

  // Drag & drop handlers on editor
  const handleDragOver = (e: React.DragEvent) => {
    if (disabled || isSourceMode) return;
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      setIsDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (disabled || isSourceMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    if (disabled || isSourceMode) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingFile(false);

      const file = e.dataTransfer.files[0];
      await handleProcessImageFile(file);
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

  // Image Modal Submission
  const handleOpenImageModal = () => {
    setIsImageModalOpen(true);
    setImageUrlInput('');
    setModalSelectedFile(null);
    setModalPreviewUrl(null);
    setUploadError(null);
    setImageModalMode(onUploadImage ? 'upload' : 'url');
  };

  const handleModalFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Le fichier sélectionné doit être une image.');
      return;
    }
    setUploadError(null);
    setModalSelectedFile(file);
    const preview = URL.createObjectURL(file);
    setModalPreviewUrl(preview);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (imageModalMode === 'url') {
      if (!imageUrlInput.trim()) return;
      insertImageAtCursor(imageUrlInput.trim());
      setIsImageModalOpen(false);
    } else {
      if (!modalSelectedFile) {
        setUploadError('Veuillez sélectionner ou déposer une image.');
        return;
      }
      setIsUploading(true);
      setUploadError(null);
      try {
        if (onUploadImage) {
          const url = await onUploadImage(modalSelectedFile);
          insertImageAtCursor(url, modalSelectedFile.name);
        } else {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const res = ev.target?.result as string;
            if (res) insertImageAtCursor(res, modalSelectedFile.name);
          };
          reader.readAsDataURL(modalSelectedFile);
        }
        setIsImageModalOpen(false);
      } catch (err: any) {
        setUploadError(err.message || 'Erreur lors du téléversement.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div
      className={`border rounded-2xl bg-white shadow-xs overflow-hidden transition relative ${
        isDraggingFile
          ? 'border-indigo-500 ring-2 ring-indigo-200'
          : 'border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100'
      }`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Barre d'outils WYSIWYG */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-slate-700 select-none">
        {/* Formatage basique */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-slate-200">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            disabled={disabled || isSourceMode}
            title="Gras (Ctrl+B)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            disabled={disabled || isSourceMode}
            title="Italique (Ctrl+I)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            disabled={disabled || isSourceMode}
            title="Souligné (Ctrl+U)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('strikeThrough')}
            disabled={disabled || isSourceMode}
            title="Barré"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
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
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <Heading className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<blockquote>')}
            disabled={disabled || isSourceMode}
            title="Citation"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <Quote className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            disabled={disabled || isSourceMode}
            title="Liste à puces"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            disabled={disabled || isSourceMode}
            title="Liste numérotée"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleInsertLink}
            disabled={disabled || isSourceMode}
            title="Insérer un lien"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenImageModal}
            disabled={disabled || isSourceMode}
            title="Insérer / Uploader une image (Drag & Drop)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 hover:text-indigo-600 disabled:opacity-40 transition cursor-pointer"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertHorizontalRule')}
            disabled={disabled || isSourceMode}
            title="Ligne de séparation"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
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
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-slate-600 text-xs font-medium disabled:opacity-40 transition cursor-pointer"
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
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 disabled:opacity-40 transition cursor-pointer"
          >
            <RemoveFormatting className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsSourceMode(!isSourceMode)}
            disabled={disabled}
            title={isSourceMode ? 'Revenir au mode Visuel' : 'Afficher le code source HTML'}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isSourceMode
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Upload error banner if any */}
      {uploadError && (
        <div className="bg-rose-50 border-b border-rose-200 px-3 py-1.5 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Drag & drop overlay indicator */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-20 bg-indigo-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 transition-all duration-200 pointer-events-none">
          <Upload className="w-12 h-12 mb-2 animate-bounce" />
          <p className="font-bold text-base">Déposez votre image ici</p>
          <p className="text-xs text-indigo-100">Elle sera automatiquement téléversée et insérée</p>
        </div>
      )}

      {/* Loading overlay when uploading image */}
      {isUploading && (
        <div className="absolute inset-0 z-20 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center text-slate-800 p-6 transition-all duration-200">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
          <p className="font-semibold text-xs">Téléversement de l'image en cours...</p>
        </div>
      )}

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

      {/* Hidden file input for drag/click */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml, image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleProcessImageFile(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />

      {/* Modal: Insérer / Uploader une image */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                <span>Insérer une image</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Tabs Mode */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImageModalMode('upload')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  imageModalMode === 'upload'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Uploader (Drag & Drop)</span>
              </button>
              <button
                type="button"
                onClick={() => setImageModalMode('url')}
                className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  imageModalMode === 'url'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>URL Web</span>
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              {imageModalMode === 'upload' ? (
                <div className="space-y-3">
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/gif, image/svg+xml, image/avif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleModalFileSelect(file);
                    }}
                  />

                  {/* Dropzone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsModalDragging(true);
                    }}
                    onDragLeave={() => setIsModalDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsModalDragging(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleModalFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => modalFileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                      isModalDragging
                        ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
                        : modalPreviewUrl
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20'
                    }`}
                  >
                    {modalPreviewUrl ? (
                      <div className="space-y-2">
                        <img
                          src={modalPreviewUrl}
                          alt="Aperçu"
                          className="h-28 max-w-full object-contain rounded-xl mx-auto shadow-xs border border-slate-200"
                        />
                        <p className="text-xs font-semibold text-emerald-800 flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>{modalSelectedFile?.name}</span>
                        </p>
                        <span className="text-[11px] text-slate-500">
                          Cliquez ou déposez une autre image pour changer
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            Glissez-déposez une image ici
                          </p>
                          <p className="text-[11px] text-slate-500">
                            ou <span className="text-indigo-600 font-semibold underline">parcourez vos fichiers</span>
                          </p>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          PNG, JPG, WebP, GIF, SVG jusqu'à 10 Mo
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Adresse URL de l'image <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://example.com/image.png"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                    required
                    autoFocus
                  />
                  {imageUrlInput && (
                    <div className="mt-3 p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center">
                      <img
                        src={imageUrlInput}
                        alt="Preview"
                        className="max-h-28 object-contain rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsImageModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={
                    isUploading ||
                    (imageModalMode === 'upload' && !modalSelectedFile) ||
                    (imageModalMode === 'url' && !imageUrlInput.trim())
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Insérer l'image</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
