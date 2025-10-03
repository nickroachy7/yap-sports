import { Suspense } from 'react'
import PlayersPageContent from './PlayersPageContent'
import { LoadingSkeleton, Card, ContentContainer, StandardLayout } from '@/components/ui'

function PlayersPageLoading() {
  return (
    <StandardLayout>
      <ContentContainer>
        <Card className="p-6">
          <div className="text-center py-4">
            <div className="text-lg font-semibold text-white mb-2">Loading Players...</div>
            <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
              Preparing player data
            </div>
          </div>
          {[...Array(10)].map((_, i) => (
            <LoadingSkeleton key={i} />
          ))}
        </Card>
      </ContentContainer>
    </StandardLayout>
  )
}

export default function PlayersPage() {
  return (
    <Suspense fallback={<PlayersPageLoading />}>
      <PlayersPageContent />
    </Suspense>
  )
}
