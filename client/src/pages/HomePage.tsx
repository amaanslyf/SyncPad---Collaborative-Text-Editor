import { Layout } from '../components/Layout/Layout';
import { Header } from '../components/Layout/Header';
import { DocumentList } from '../components/Documents/DocumentList';

export function HomePage() {
  return (
    <Layout>
      <Header />
      <div className="documents-page">
        <div className="documents-page__header">
          <div>
            <h1 className="documents-page__title">Your Documents</h1>
            <p className="documents-page__subtitle">
              Create, edit, and collaborate on documents in real-time
            </p>
          </div>
        </div>
        <DocumentList />
      </div>
    </Layout>
  );
}
