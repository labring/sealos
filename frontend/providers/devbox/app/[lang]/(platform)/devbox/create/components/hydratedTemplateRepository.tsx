// app/hydratedPosts.jsx
import { listOfficialTemplateRepository } from '@/api/template'
import { dehydrate, Hydrate, useQueryClient } from '@tanstack/react-query'

export default async function HydratedTemplateRepository({children}:{children:React.ReactNode}) {
  const queryClient = useQueryClient()
  await queryClient.prefetchQuery(
    ['list-official-template-repository'],
    listOfficialTemplateRepository
  )
  const dehydratedState = dehydrate(queryClient)
  return (
    <Hydrate state={dehydratedState}>
      {children}
    </Hydrate>
  )
}