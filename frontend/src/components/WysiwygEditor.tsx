import React, { useRef, useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
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
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  Rows,
  Columns,
  Trash2,
  Type,
  Lock,
  EyeOff,
  UserCheck,
  Map,
  Users,
} from 'lucide-react';
import { campaignsApi } from '../api/campaigns';

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  onUploadImage?: (file: File) => Promise<string>;
  campaignId?: number;
  availableCharacters?: Array<{ id: number; name: string; concept?: string; avatar?: string }>;
  availableUsers?: Array<{ id?: number; username: string; avatar?: string }>;
  availableCartes?: Array<{ id: number; name: string }>;
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  value,
  onChange,
  placeholder = 'Rédigez votre message ici...',
  disabled = false,
  minHeight = '180px',
  onUploadImage,
  campaignId,
  availableCharacters,
  availableUsers,
  availableCartes,
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

  // More options & Table states
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const [isCursorInTable, setIsCursorInTable] = useState<boolean>(false);
  const [isTableModalOpen, setIsTableModalOpen] = useState<boolean>(false);
  const [tableRowsInput, setTableRowsInput] = useState<number>(3);
  const [tableColsInput, setTableColsInput] = useState<number>(3);
  const [tableHasHeader, setTableHasHeader] = useState<boolean>(true);
  const savedRangeRef = useRef<Range | null>(null);

  // Advanced BBCode Modals states (Hide, Private, PNJ, Carte)
  const [isHideModalOpen, setIsHideModalOpen] = useState<boolean>(false);
  const [hideTitleInput, setHideTitleInput] = useState<string>('');
  const [hideContentInput, setHideContentInput] = useState<string>('');

  const [isPrivateModalOpen, setIsPrivateModalOpen] = useState<boolean>(false);
  const [privateTargetInput, setPrivateTargetInput] = useState<string>('');
  const [privateContentInput, setPrivateContentInput] = useState<string>('');

  const [isPnjModalOpen, setIsPnjModalOpen] = useState<boolean>(false);
  const [pnjTargetInput, setPnjTargetInput] = useState<string>('');
  const [pnjLabelInput, setPnjLabelInput] = useState<string>('');

  const [isCarteModalOpen, setIsCarteModalOpen] = useState<boolean>(false);
  const [carteTargetInput, setCarteTargetInput] = useState<string>('');
  const [carteLabelInput, setCarteLabelInput] = useState<string>('');

  const [campaignCartes, setCampaignCartes] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoadingCartes, setIsLoadingCartes] = useState<boolean>(false);

  useEffect(() => {
    if (availableCartes && availableCartes.length > 0) {
      setCampaignCartes(availableCartes);
      return;
    }
    if (campaignId) {
      setIsLoadingCartes(true);
      campaignsApi
        .getCampaignCartes(campaignId)
        .then((cartes) => {
          setCampaignCartes(cartes.map((c) => ({ id: c.id, name: c.name })));
        })
        .catch((err) => {
          console.error('Erreur chargement cartes pour wysiwyg:', err);
        })
        .finally(() => {
          setIsLoadingCartes(false);
        });
    } else {
      setCampaignCartes([]);
    }
  }, [campaignId, availableCartes]);

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };

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

  const handleFormatBlock = (tag: string) => {
    if (disabled || isSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      let parent: Node | null = selection.anchorNode;
      let currentTag = '';
      while (parent && parent !== editorRef.current) {
        if (parent.nodeType === Node.ELEMENT_NODE) {
          const elName = (parent as HTMLElement).tagName.toLowerCase();
          if (['h1', 'h2', 'h3', 'blockquote', 'p'].includes(elName)) {
            currentTag = elName;
            break;
          }
        }
        parent = parent.parentNode;
      }
      const targetTag = tag.replace(/<|>/g, '').toLowerCase();
      if (currentTag === targetTag) {
        document.execCommand('formatBlock', false, '<p>');
      } else {
        document.execCommand('formatBlock', false, `<${targetTag}>`);
      }
    } else {
      document.execCommand('formatBlock', false, tag.startsWith('<') ? tag : `<${tag}>`);
    }
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

    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
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

    savedRangeRef.current = null;
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
    saveSelection();
    setIsImageModalOpen(true);
    setImageUrlInput('');
    setModalSelectedFile(null);
    setModalPreviewUrl(null);
    setUploadError(null);
    setImageModalMode(onUploadImage ? 'upload' : 'url');
  };

  const handleOpenTableModal = () => {
    saveSelection();
    setIsTableModalOpen(true);
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

  const handleConfirmImageModal = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
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

  const handleConfirmTableModal = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    insertTable(
      Math.max(1, Math.min(20, tableRowsInput)),
      Math.max(1, Math.min(10, tableColsInput)),
      tableHasHeader
    );
    setIsTableModalOpen(false);
  };

  // Selection and Text Insertion helpers
  const getSelectedText = (): string => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      return selection.toString();
    }
    return '';
  };

  const insertTextAtCursor = (text: string) => {
    if (disabled) return;
    if (isSourceMode) {
      onChange((value || '') + text);
      return;
    }
    if (editorRef.current) {
      editorRef.current.focus();
    }

    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const node = document.createTextNode(text);
      range.insertNode(node);
      range.setStartAfter(node);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (editorRef.current) {
      editorRef.current.appendChild(document.createTextNode(text));
    }

    savedRangeRef.current = null;
    handleInput();
  };

  const togglePrivateTarget = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const currentTargets = privateTargetInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const existsIndex = currentTargets.findIndex(
      (t) => t.toLowerCase() === trimmed.toLowerCase()
    );

    let updatedTargets: string[];
    if (existsIndex >= 0) {
      updatedTargets = currentTargets.filter((_, idx) => idx !== existsIndex);
    } else {
      updatedTargets = [...currentTargets, trimmed];
    }

    setPrivateTargetInput(updatedTargets.join(', '));
  };

  const isTargetSelected = (name: string) => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;
    const currentTargets = privateTargetInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return currentTargets.includes(trimmed);
  };

  // Open Advanced Modals
  const handleOpenHideModal = () => {
    saveSelection();
    const selected = getSelectedText();
    setHideTitleInput('');
    setHideContentInput(selected);
    setIsHideModalOpen(true);
  };

  const handleOpenPrivateModal = () => {
    saveSelection();
    const selected = getSelectedText();
    setPrivateTargetInput('');
    setPrivateContentInput(selected);
    setIsPrivateModalOpen(true);
  };

  const handleOpenPnjModal = () => {
    saveSelection();
    const selected = getSelectedText();
    const defaultPnj = availableCharacters && availableCharacters.length > 0 ? availableCharacters[0].name : '';
    setPnjTargetInput(defaultPnj);
    setPnjLabelInput(selected || defaultPnj);
    setIsPnjModalOpen(true);
  };

  const handleOpenCarteModal = () => {
    saveSelection();
    const selected = getSelectedText();
    const cartes = availableCartes || campaignCartes;
    const defaultCarte = cartes.length > 0 ? cartes[0] : null;

    let matchedCarte = cartes.find(
      (c) => c.name.toLowerCase() === selected.toLowerCase() || String(c.id) === selected
    );
    if (!matchedCarte && defaultCarte) {
      matchedCarte = defaultCarte;
    }

    if (matchedCarte) {
      setCarteTargetInput(String(matchedCarte.id));
      setCarteLabelInput(selected || matchedCarte.name);
    } else {
      setCarteTargetInput('');
      setCarteLabelInput(selected || '');
    }
    setIsCarteModalOpen(true);
  };

  // Confirm Advanced Modals
  const handleConfirmHideModal = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const title = hideTitleInput.trim();
    const content = hideContentInput || 'Contenu masqué';
    const tag = title ? `[hide=${title}]${content}[/hide]` : `[hide]${content}[/hide]`;
    insertTextAtCursor(tag);
    setIsHideModalOpen(false);
  };

  const handleConfirmPrivateModal = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const target = privateTargetInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .join(', ');
    if (!target) return;
    const content = privateContentInput || 'Contenu privé';
    const tag = `[private=${target}]${content}[/private]`;
    insertTextAtCursor(tag);
    setIsPrivateModalOpen(false);
  };

  const handleConfirmPnjModal = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const target = pnjTargetInput.trim() || 'PNJ';
    const label = pnjLabelInput.trim() || target;
    const tag = `[pnj=${target}]${label}[/pnj]`;
    insertTextAtCursor(tag);
    setIsPnjModalOpen(false);
  };

  const handleConfirmCarteModal = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const target = carteTargetInput.trim() || '1';
    const label = carteLabelInput.trim() || `Carte #${target}`;
    const tag = `[carte=${target}]${label}[/carte]`;
    insertTextAtCursor(tag);
    setIsCarteModalOpen(false);
  };

  // Table and cursor helper functions
  const checkCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      let node: Node | null = selection.anchorNode;
      let foundTable = false;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = (node as HTMLElement).tagName.toLowerCase();
          if (tag === 'table' || tag === 'td' || tag === 'th') {
            foundTable = true;
            break;
          }
        }
        node = node.parentNode;
      }
      setIsCursorInTable(foundTable);
    } else {
      setIsCursorInTable(false);
    }
  };

  const getCurrentTableCell = (): {
    cell: HTMLTableCellElement | null;
    row: HTMLTableRowElement | null;
    table: HTMLTableElement | null;
  } => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editorRef.current?.contains(selection.anchorNode)) {
      return { cell: null, row: null, table: null };
    }
    let node: Node | null = selection.anchorNode;
    let cell: HTMLTableCellElement | null = null;
    let row: HTMLTableRowElement | null = null;
    let table: HTMLTableElement | null = null;

    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        if ((tagName === 'td' || tagName === 'th') && !cell) {
          cell = el as HTMLTableCellElement;
        }
        if (tagName === 'tr' && !row) {
          row = el as HTMLTableRowElement;
        }
        if (tagName === 'table' && !table) {
          table = el as HTMLTableElement;
        }
      }
      node = node.parentNode;
    }
    return { cell, row, table };
  };

  const insertTable = (rows: number = 3, cols: number = 3, hasHeader: boolean = true) => {
    if (disabled || isSourceMode) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }

    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }

    const table = document.createElement('table');
    table.className = 'wysiwyg-table';

    let bodyRows = rows;
    if (hasHeader) {
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const th = document.createElement('th');
        th.innerHTML = `En-tête ${c + 1}`;
        headerRow.appendChild(th);
      }
      thead.appendChild(headerRow);
      table.appendChild(thead);
      bodyRows = Math.max(1, rows - 1);
    }

    const tbody = document.createElement('tbody');
    for (let r = 0; r < bodyRows; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < cols; c++) {
        const td = document.createElement('td');
        td.innerHTML = `Cellule ${r + 1}-${c + 1}`;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);

    const pAfter = document.createElement('p');
    pAfter.innerHTML = '<br>';

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(pAfter);
      range.insertNode(table);

      const firstCell = table.querySelector('th, td');
      if (firstCell) {
        const newRange = document.createRange();
        newRange.selectNodeContents(firstCell);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);
      }
    } else if (editorRef.current) {
      editorRef.current.appendChild(table);
      editorRef.current.appendChild(pAfter);
    }

    savedRangeRef.current = null;
    handleInput();
    setIsCursorInTable(true);
  };

  const handleInsertTableRow = (position: 'above' | 'below' = 'below') => {
    if (disabled || isSourceMode) return;
    const { row, table } = getCurrentTableCell();
    if (!row || !table) return;

    const colCount = row.children.length;
    const newRow = document.createElement('tr');
    const isHead = row.parentElement?.tagName.toLowerCase() === 'thead';

    for (let i = 0; i < colCount; i++) {
      const cell = document.createElement(isHead && position === 'above' ? 'th' : 'td');
      cell.innerHTML = '&nbsp;';
      newRow.appendChild(cell);
    }

    if (position === 'above') {
      row.parentNode?.insertBefore(newRow, row);
    } else {
      row.parentNode?.insertBefore(newRow, row.nextSibling);
    }

    handleInput();
  };

  const handleDeleteTableRow = () => {
    if (disabled || isSourceMode) return;
    const { row, table } = getCurrentTableCell();
    if (!row || !table) return;

    const allRows = table.querySelectorAll('tr');
    if (allRows.length <= 1) {
      table.remove();
      setIsCursorInTable(false);
    } else {
      row.remove();
    }
    handleInput();
  };

  const handleInsertTableCol = (position: 'left' | 'right' = 'right') => {
    if (disabled || isSourceMode) return;
    const { cell, row, table } = getCurrentTableCell();
    if (!cell || !row || !table) return;

    const colIndex = Array.from(row.children).indexOf(cell);
    if (colIndex === -1) return;

    const allRows = table.querySelectorAll('tr');
    allRows.forEach((tr) => {
      const isHead = tr.parentElement?.tagName.toLowerCase() === 'thead' || tr.querySelector('th') !== null;
      const newCell = document.createElement(isHead ? 'th' : 'td');
      newCell.innerHTML = '&nbsp;';

      const targetCell = tr.children[colIndex];
      if (targetCell) {
        if (position === 'left') {
          tr.insertBefore(newCell, targetCell);
        } else {
          tr.insertBefore(newCell, targetCell.nextSibling);
        }
      } else {
        tr.appendChild(newCell);
      }
    });

    handleInput();
  };

  const handleDeleteTableCol = () => {
    if (disabled || isSourceMode) return;
    const { cell, row, table } = getCurrentTableCell();
    if (!cell || !row || !table) return;

    const colIndex = Array.from(row.children).indexOf(cell);
    if (colIndex === -1) return;

    const allRows = table.querySelectorAll('tr');
    const maxCols = Math.max(...Array.from(allRows).map((r) => r.children.length));

    if (maxCols <= 1) {
      table.remove();
      setIsCursorInTable(false);
    } else {
      allRows.forEach((tr) => {
        if (tr.children[colIndex]) {
          tr.children[colIndex].remove();
        }
      });
    }

    handleInput();
  };

  const handleDeleteTable = () => {
    if (disabled || isSourceMode) return;
    const { table } = getCurrentTableCell();
    if (table) {
      table.remove();
      setIsCursorInTable(false);
      handleInput();
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
            onClick={() => handleFormatBlock('h1')}
            disabled={disabled || isSourceMode}
            title="Titre 1 (H1)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatBlock('h2')}
            disabled={disabled || isSourceMode}
            title="Titre 2 (H2)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatBlock('h3')}
            disabled={disabled || isSourceMode}
            title="Titre 3 (H3)"
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleFormatBlock('blockquote')}
            disabled={disabled || isSourceMode}
            title="Citation (Blockquote)"
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

        {/* Éléments avancés (Private, Hide, PNJ, Carte) */}
        <div className="flex items-center gap-1 px-1 border-r border-slate-200">
          <button
            type="button"
            onClick={handleOpenPrivateModal}
            disabled={disabled || isSourceMode}
            title="Message privé ([private=Destinataire]texte[/private])"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-amber-100 text-amber-800 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Privé</span>
          </button>
          <button
            type="button"
            onClick={handleOpenHideModal}
            disabled={disabled || isSourceMode}
            title="Texte masqué / repliable ([hide=Titre]texte[/hide])"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-100 text-indigo-700 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Masqué</span>
          </button>
          <button
            type="button"
            onClick={handleOpenPnjModal}
            disabled={disabled || isSourceMode}
            title="Lien vers un PNJ ([pnj=Nom]Nom[/pnj])"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-100 text-purple-700 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">PNJ</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCarteModal}
            disabled={disabled || isSourceMode}
            title="Lien vers une Carte ([carte=ID]Nom[/carte])"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-emerald-100 text-emerald-800 text-xs font-semibold disabled:opacity-40 transition cursor-pointer"
          >
            <Map className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Carte</span>
          </button>
        </div>

        {/* Nettoyage, Options & Source */}
        <div className="flex items-center gap-0.5 ml-auto">
          <button
            type="button"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            disabled={disabled}
            title="Plus d'options (alignement, taille de police, tableaux)"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              showMoreOptions
                ? 'bg-indigo-100 text-indigo-700 shadow-xs'
                : 'hover:bg-slate-200 text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Options</span>
            {showMoreOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
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

      {/* Barre d'outils secondaire : Plus d'options (Alignement, Taille de police, Tableaux) */}
      {showMoreOptions && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-100/95 border-b border-slate-200 text-slate-700 text-xs select-none">
          {/* Alignements */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-300">
            <span className="text-[11px] font-medium text-slate-500 mr-1 hidden sm:inline">Alignement :</span>
            <button
              type="button"
              onClick={() => executeCommand('justifyLeft')}
              disabled={disabled || isSourceMode}
              title="Aligner à gauche"
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('justifyCenter')}
              disabled={disabled || isSourceMode}
              title="Centrer"
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('justifyRight')}
              disabled={disabled || isSourceMode}
              title="Aligner à droite"
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => executeCommand('justifyFull')}
              disabled={disabled || isSourceMode}
              title="Justifier"
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition cursor-pointer"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          {/* Taille de police */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-slate-300">
            <Type className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">Taille :</span>
            <select
              aria-label="Taille de police"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  executeCommand('fontSize', e.target.value);
                  e.target.value = '';
                }
              }}
              disabled={disabled || isSourceMode}
              className="h-7 px-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="" disabled>Taille du texte</option>
              <option value="1">Très petit (10px)</option>
              <option value="2">Petit (12px)</option>
              <option value="3">Normal (14px)</option>
              <option value="4">Grand (18px)</option>
              <option value="5">Très grand (24px)</option>
              <option value="6">Gigantesque (32px)</option>
              <option value="7">Énorme (40px)</option>
            </select>
          </div>

          {/* Tableaux */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleOpenTableModal}
              disabled={disabled || isSourceMode}
              title="Insérer un tableau"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 hover:border-indigo-300 text-slate-700 font-medium text-xs disabled:opacity-40 transition cursor-pointer shadow-2xs"
            >
              <TableIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tableau</span>
            </button>

            {/* Actions contextuelles quand le curseur est dans un tableau */}
            {isCursorInTable && (
              <div className="flex items-center gap-1 bg-indigo-50/80 px-1.5 py-0.5 rounded-lg border border-indigo-200">
                <span className="text-[10px] font-bold text-indigo-600 hidden md:inline">Tableau :</span>
                <button
                  type="button"
                  onClick={() => handleInsertTableRow('below')}
                  disabled={disabled || isSourceMode}
                  title="Ajouter une ligne en-dessous"
                  className="px-1.5 py-0.5 rounded hover:bg-indigo-100 text-indigo-900 font-medium transition cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <Rows className="w-3 h-3 text-indigo-600" />
                  <span>+ Ligne</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTableRow}
                  disabled={disabled || isSourceMode}
                  title="Supprimer la ligne sélectionnée"
                  className="px-1.5 py-0.5 rounded hover:bg-rose-100 text-rose-700 font-medium transition cursor-pointer text-[11px]"
                >
                  - Ligne
                </button>
                <div className="w-px h-3 bg-indigo-200 mx-0.5" />
                <button
                  type="button"
                  onClick={() => handleInsertTableCol('right')}
                  disabled={disabled || isSourceMode}
                  title="Ajouter une colonne à droite"
                  className="px-1.5 py-0.5 rounded hover:bg-indigo-100 text-indigo-900 font-medium transition cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <Columns className="w-3 h-3 text-indigo-600" />
                  <span>+ Col</span>
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTableCol}
                  disabled={disabled || isSourceMode}
                  title="Supprimer la colonne sélectionnée"
                  className="px-1.5 py-0.5 rounded hover:bg-rose-100 text-rose-700 font-medium transition cursor-pointer text-[11px]"
                >
                  - Col
                </button>
                <div className="w-px h-3 bg-indigo-200 mx-0.5" />
                <button
                  type="button"
                  onClick={handleDeleteTable}
                  disabled={disabled || isSourceMode}
                  title="Supprimer tout le tableau"
                  className="px-1.5 py-0.5 rounded hover:bg-rose-100 text-rose-600 font-semibold transition cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Supprimer</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
          onInput={() => {
            handleInput();
            checkCursorPosition();
          }}
          onBlur={handleInput}
          onKeyUp={checkCursorPosition}
          onMouseUp={checkCursorPosition}
          onClick={checkCursorPosition}
          onFocus={checkCursorPosition}
          style={{ minHeight }}
          data-placeholder={placeholder}
          className={`wysiwyg-content wysiwyg-editor-area p-4 text-sm sm:text-base text-slate-900 focus:outline-none overflow-y-auto leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none ${
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

            <div className="space-y-4">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleConfirmImageModal();
                      }
                    }}
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
                  type="button"
                  onClick={handleConfirmImageModal}
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
            </div>
          </div>
        </div>
      )}
      {/* Modal: Insérer un tableau */}
      {isTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-indigo-600" />
                <span>Insérer un tableau</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTableModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="space-y-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmTableModal();
                }
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lignes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={tableRowsInput}
                    onChange={(e) => setTableRowsInput(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Colonnes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={tableColsInput}
                    onChange={(e) => setTableColsInput(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Raccourcis rapides */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dimensions rapides
                </label>
                <div className="flex gap-2">
                  {[
                    { r: 2, c: 2, label: '2 x 2' },
                    { r: 3, c: 3, label: '3 x 3' },
                    { r: 4, c: 3, label: '4 x 3' },
                    { r: 5, c: 4, label: '5 x 4' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setTableRowsInput(preset.r);
                        setTableColsInput(preset.c);
                      }}
                      className={`flex-1 py-1 text-xs font-medium rounded-lg border transition cursor-pointer ${
                        tableRowsInput === preset.r && tableColsInput === preset.c
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="table-header-checkbox"
                  checked={tableHasHeader}
                  onChange={(e) => setTableHasHeader(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4"
                />
                <label
                  htmlFor="table-header-checkbox"
                  className="text-xs font-medium text-slate-700 cursor-pointer select-none"
                >
                  Inclure une ligne d'en-tête (titre)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTableModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer"
                >
                  Insérer le tableau
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Insérer un texte masqué ([hide]) */}
      {isHideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-indigo-600" />
                <span>Zone de texte repliable (Masqué)</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsHideModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="space-y-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleConfirmHideModal();
                }
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titre du volet (facultatif)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Indice secret, Spoiler, Détails..."
                  value={hideTitleInput}
                  onChange={(e) => setHideTitleInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contenu à masquer
                </label>
                <textarea
                  rows={4}
                  placeholder="Texte qui sera masqué et replié par défaut..."
                  value={hideContentInput}
                  onChange={(e) => setHideContentInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHideModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmHideModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Insérer</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Insérer un message privé ([private]) */}
      {isPrivateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-600" />
                <span>Message Privé</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPrivateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="space-y-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleConfirmPrivateModal();
                }
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destinataire(s) (personnages ou joueurs, séparés par des virgules)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gandalf, Legolas, Joueur1..."
                  value={privateTargetInput}
                  onChange={(e) => setPrivateTargetInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  autoFocus
                />

                {/* Multi-sélection : Personnages et Joueurs */}
                <div className="space-y-3 mt-3">
                  {/* Personnages */}
                  {availableCharacters && availableCharacters.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                        <span>Personnages de la partie :</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50/80 rounded-xl border border-slate-100">
                        {availableCharacters.map((c) => {
                          const selected = isTargetSelected(c.name);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => togglePrivateTarget(c.name)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                                selected
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                  : 'bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-900 border-slate-200'
                              }`}
                            >
                              {selected && <Check className="w-3 h-3 shrink-0" />}
                              <span>{c.name}</span>
                              {c.concept && (
                                <span
                                  className={`text-[10px] ${
                                    selected ? 'text-purple-200' : 'text-slate-400'
                                  }`}
                                >
                                  ({c.concept})
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Joueurs */}
                  {availableUsers && availableUsers.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Joueurs / Comptes de la partie :</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50/80 rounded-xl border border-slate-100">
                        {availableUsers.map((u) => {
                          const selected = isTargetSelected(u.username);
                          return (
                            <button
                              key={u.id ?? u.username}
                              type="button"
                              onClick={() => togglePrivateTarget(u.username)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                                selected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                  : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border-slate-200'
                              }`}
                            >
                              {selected && <Check className="w-3 h-3 shrink-0" />}
                              <span>{u.username}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contenu secret
                </label>
                <textarea
                  rows={4}
                  placeholder="Message visible uniquement par les destinataires et le MJ..."
                  value={privateContentInput}
                  onChange={(e) => setPrivateContentInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-y"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPrivateModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPrivateModal}
                  disabled={!privateTargetInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Insérer le message privé</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Insérer un lien PNJ ([pnj]) */}
      {isPnjModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                <span>Lien vers un PNJ</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsPnjModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="space-y-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmPnjModal();
                }
              }}
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom ou Identifiant du PNJ
                </label>
                <input
                  type="text"
                  placeholder="Ex: Eminence, Garde, 142..."
                  value={pnjTargetInput}
                  onChange={(e) => {
                    setPnjTargetInput(e.target.value);
                    if (!pnjLabelInput || pnjLabelInput === pnjTargetInput) {
                      setPnjLabelInput(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  autoFocus
                />
                {availableCharacters && availableCharacters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto">
                    <span className="text-[11px] text-slate-500 self-center mr-1">Choisir :</span>
                    {availableCharacters.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setPnjTargetInput(c.name);
                          if (!pnjLabelInput) setPnjLabelInput(c.name);
                        }}
                        className="px-2 py-0.5 text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-md border border-purple-200 transition cursor-pointer"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Libellé du lien
                </label>
                <input
                  type="text"
                  placeholder="Texte affiché sur le lien (ex: Eminence)"
                  value={pnjLabelInput}
                  onChange={(e) => setPnjLabelInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPnjModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPnjModal}
                  disabled={!pnjTargetInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Insérer le lien PNJ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Insérer un lien Carte ([carte]) */}
      {isCarteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Map className="w-5 h-5 text-emerald-600" />
                <span>Lien vers une Carte</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCarteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              className="space-y-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmCarteModal();
                }
              }}
            >
              {/* Sélection parmi les cartes de la partie */}
              {(availableCartes || campaignCartes).length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Choisir une carte de la partie :
                  </label>
                  <select
                    value={carteTargetInput}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setCarteTargetInput(selectedId);
                      const found = (availableCartes || campaignCartes).find(
                        (c) => String(c.id) === selectedId
                      );
                      if (found) {
                        setCarteLabelInput(found.name);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Sélectionner une carte --</option>
                    {(availableCartes || campaignCartes).map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name} (ID: {c.id})
                      </option>
                    ))}
                  </select>

                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                    {(availableCartes || campaignCartes).map((c) => {
                      const isSelected = carteTargetInput === String(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCarteTargetInput(String(c.id));
                            setCarteLabelInput(c.name);
                          }}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          <Map className="w-3 h-3" />
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : isLoadingCartes ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Chargement des cartes de la partie...</span>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Identifiant ou Nom de la Carte
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1451, Carte du Donjon..."
                  value={carteTargetInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCarteTargetInput(val);
                    if (!carteLabelInput || carteLabelInput === `Carte #${carteTargetInput}`) {
                      setCarteLabelInput(val ? `Carte #${val}` : '');
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Libellé du lien
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carte du Donjon, Carte de test..."
                  value={carteLabelInput}
                  onChange={(e) => setCarteLabelInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCarteModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCarteModal}
                  disabled={!carteTargetInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Insérer le lien Carte</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
