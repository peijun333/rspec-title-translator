(() => {
  // 新 diff 画面（.diff-text-inner）と旧 diff 画面・blob 表示（.blob-code-inner）の行要素
  const LINE_SELECTOR = '.diff-text-inner, .blob-code-inner';

  const KEYWORDS = [
    'describe', 'context', 'it', 'specify', 'example', 'scenario', 'feature',
    'xdescribe', 'xcontext', 'xit', 'fdescribe', 'fcontext', 'fit',
    'shared_examples', 'shared_examples_for', 'shared_context',
    'it_behaves_like', 'include_examples', 'include_context',
  ];
  // 先頭の diff マーカー（+/-）・インデント → キーワード → 文字列リテラル
  const TITLE_RE = new RegExp(
    String.raw`^([+\-]?)(\s*)(?:RSpec\.)?(${KEYWORDS.join('|')})\b\s*\(?\s*(['"])((?:\\.|(?!\4).)+)\4`
  );
  const EXAMPLE_KEYWORDS = new Set(['it', 'specify', 'example', 'scenario', 'xit', 'fit']);
  const CONTEXT_KEYWORDS = new Set(['context', 'xcontext', 'fcontext', 'shared_context']);
  const CONDITION_RE = /^(when|with|without|if|unless|as|for|given|after|before|while|in|on|and|but)\b/i;
  // snake_case や Foo::Bar のようなコード上の識別子
  const CODE_TOKEN_RE = /[\w:]*(?:_|::)[\w:]*/g;
  const JAPANESE_RE = /[぀-ヿ一-鿿]/;
  // '#call' や '.perform' のようなメソッド名だけのタイトルは訳さない
  const IDENTIFIER_RE = /^[#.]?[\w:]+[?!=]?$/;
  // 'GET /api/users' のような request spec のタイトルも訳さない（「取得します」と訳されてしまう）
  const HTTP_ENDPOINT_RE = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s/;

  const cache = new Map();
  let translatorPromise = null;

  const getTranslator = () => {
    translatorPromise ??= createTranslator().catch((e) => {
      console.warn('[rspec-title-translator]', e);
      translatorPromise = null;
      throw e;
    });
    return translatorPromise;
  };

  const createTranslator = async () => {
    if (!('Translator' in self)) throw new Error('Translator API が使えないブラウザです（Chrome 138 以降が必要）');

    const options = { sourceLanguage: 'en', targetLanguage: 'ja' };
    const availability = await Translator.availability(options);
    if (availability === 'unavailable') throw new Error('en→ja の翻訳モデルが使えません');
    if (availability === 'available') return Translator.create(options);

    // 初回はモデルのダウンロードが必要。ダウンロード開始にはユーザー操作が要るのでボタンを出す
    return new Promise((resolve, reject) => {
      const button = document.createElement('button');
      button.id = 'rspec-ja-download';
      button.textContent = 'RSpec タイトル翻訳: 翻訳モデルをダウンロード';
      button.addEventListener('click', () => {
        button.disabled = true;
        Translator.create({
          ...options,
          monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
              button.textContent = `ダウンロード中… ${Math.round(e.loaded * 100)}%`;
            });
          },
        }).then((translator) => {
          button.remove();
          resolve(translator);
        }, (e) => {
          button.remove();
          reject(e);
        });
      }, { once: true });
      document.body.append(button);
    });
  };

  // 汎用の翻訳モデルはテスト名だと分からないので、英文として自然な形に組み立ててから訳す
  const toSentence = (keyword, title) => {
    // it 'returns ...' は "It returns ..." という文。主語が無いと returns を名詞扱いして「返品」と訳される
    if (EXAMPLE_KEYWORDS.has(keyword)) return `It ${title}.`;
    if (CONTEXT_KEYWORDS.has(keyword)) {
      // 末尾の ":" で「〜の場合」「〜のとき」の形に寄る
      return CONDITION_RE.test(title) ? `${title}:` : `When ${title}:`;
    }
    return title;
  };

  const polish = (ja, title) => {
    let result = ja.trim().replace(/[。:：]+$/, '').replace(/返品|返却/g, '返');
    // 翻訳モデルが識別子の大文字小文字を変えることがあるので（start_date → START_DATE）原文に戻す
    for (const token of new Set(title.match(CODE_TOKEN_RE) ?? [])) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'gi'), token);
    }
    return result;
  };

  const translate = (keyword, title) => {
    const key = `${keyword}\0${title}`;
    if (!cache.has(key)) {
      const promise = getTranslator()
        .then((t) => t.translate(toSentence(keyword, title)))
        .then((ja) => polish(ja, title));
      promise.catch(() => cache.delete(key));
      cache.set(key, promise);
    }
    return cache.get(key);
  };

  const process = (el) => {
    const line = el.textContent;
    if (el.dataset.rspecJaSource === line) return;
    el.dataset.rspecJaSource = line;
    delete el.dataset.rspecJa;

    const match = line.match(TITLE_RE);
    if (!match) return;
    const [, marker, indent, keyword, , rawTitle] = match;
    const title = rawTitle.replace(/\\(.)/g, '$1');
    if (JAPANESE_RE.test(title) || IDENTIFIER_RE.test(title) || HTTP_ENDPOINT_RE.test(title)) return;

    translate(keyword, title).then((ja) => {
      // 待っている間に React が別の行で要素を再利用していたら捨てる
      if (el.dataset.rspecJaSource !== line) return;
      // 行内に +/- が含まれる表示では、その幅も揃える
      el.dataset.rspecJa = `${' '.repeat(marker.length)}${indent}  # ${ja}`;
    }, () => {});
  };

  const scan = () => document.querySelectorAll(LINE_SELECTOR).forEach(process);

  // GitHub は SPA かつ diff を遅延・仮想スクロールで描画するので、DOM の変化ごとに走査し直す
  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  scan();
})();
