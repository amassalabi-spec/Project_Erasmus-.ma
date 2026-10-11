from lumina.core import load_documents, get_chroma_collection, get_embed_model, index_documents, retrieve
from pathlib import Path

print('Loading documents from ./data ...')
docs = load_documents(Path('./data'))
print(f'Found {len(docs)} documents')

client, collection = get_chroma_collection()
embed_model = get_embed_model()

if len(docs) == 0:
    print('No documents to index. Create some .txt/.md files under ./data to test.')
    exit(0)

print('Indexing documents into Chroma (this may take a while)...')
count = index_documents(docs, collection, embed_model)
print(f'Indexed {count} documents')

# Take first sentence of first doc as a query to ensure retrieval works
sample_text = docs[0]['text']
query = sample_text.split('\n')[0][:200]
selected_profile = docs[0]['meta'].get('profile','all')
print('Running retrieval with query (truncated):')
print(query)

docs_ret, metas_ret = retrieve(query, selected_profile, collection, embed_model)
print(f'Returned {len(docs_ret)} documents')
for i, (d,m) in enumerate(zip(docs_ret, metas_ret)):
    print(f'--- Result {i+1} ---')
    print('Source:', m.get('source'))
    print('Scope/Profile:', m.get('scope'), m.get('profile'))
    print('Snippet:', d[:300].replace('\n',' '))

print('Test complete.')
