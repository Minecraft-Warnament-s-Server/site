let convertedText;



function convertDecreeToHtmlString(decreeText) {
  let html = decreeText;

  // Discord headers: ##, ###, ####, etc.
  html = html.replace(/^######\s*(.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^#####\s*(.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^####\s*(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^###\s*(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s*(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s*(.+)$/gm, '<h1>$1</h1>');

  // Bold, italic, underline, strikethrough, spoiler
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([\s\S]+?)__/g, '<u>$1</u>');
  html = html.replace(/~~([\s\S]+?)~~/g, '<del>$1</del>');
  html = html.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');
  html = html.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="spoiler">$1</span>');

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Code block (```)
  html = html.replace(/```([\s\S]*?)```/g, function(match, p1) {
    return '<pre><code>' + p1.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>';
  });

  // Blockquotes
  html = html.replace(/^>\s?(.+)$/gm, '<blockquote>$1</blockquote>');

  // Unordered lists
  html = html.replace(/((?:^[-*+] .+(?:\n|$))+)/gm, function(listBlock) {
    const items = listBlock.trim().split(/\n/).filter(Boolean).map(line => {
      const m = line.match(/^[-*+]\s+(.+)/);
      return m ? `<li>${m[1]}</li>` : line;
    });
    return `<ul>${items.join('')}</ul>`;
  });

  // Ordered lists
  html = html.replace(/((?:^\d+\. .+(?:\n|$))+)/gm, function(listBlock) {
    const items = listBlock.trim().split(/\n/).filter(Boolean).map(line => {
      const m = line.match(/^\d+\.\s+(.+)/);
      return m ? `<li>${m[1]}</li>` : line;
    });
    return `<ol>${items.join('')}</ol>`;
  });

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>');

  // Newlines to <br> (for single newlines)
  html = html.replace(/([^>])\n(?=[^\n])/g, '$1<br>');

  // Remove multiple <br> in a row
  html = html.replace(/(<br>\s*){3,}/g, '<br><br>');

  // Remove leading/trailing whitespace and collapse to one line
  html = html.replace(/\s+/g, ' ').trim();

  return html;
}



function convertDecreeToHtmlStringFromClipboard() {
  // Создаём модальное окно
  let modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';

  let box = document.createElement('div');
  box.style.background = '#232323';
  box.style.padding = '24px';
  box.style.borderRadius = '12px';
  box.style.minWidth = '400px';
  box.style.maxWidth = '90vw';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.gap = '12px';

  let textarea = document.createElement('textarea');
  textarea.rows = 12;
  textarea.style.width = '100%';
  textarea.style.fontFamily = 'monospace';
  textarea.style.fontSize = '15px';
  textarea.placeholder = 'Вставьте сюда текст для конвертации...';

  let btnConvert = document.createElement('button');
  btnConvert.textContent = 'Конвертировать';
  btnConvert.style.marginTop = '8px';
  btnConvert.onclick = function() {
    textarea.value = convertDecreeToHtmlString(textarea.value);
  };

  let btnClose = document.createElement('button');
  btnClose.textContent = 'Закрыть';
  btnClose.style.marginTop = '8px';
  btnClose.onclick = function() {
    document.body.removeChild(modal);
  };

  box.appendChild(textarea);
  box.appendChild(btnConvert);
  box.appendChild(btnClose);
  modal.appendChild(box);
  document.body.appendChild(modal);
}
