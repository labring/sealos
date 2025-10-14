import ReactSwagger from '@/components/SwaggerUi'
import { getApiDocs } from '@/lib/swagger'

async function ApiDocsPage() {
  const spec = await getApiDocs()

  return (
    <section className="container">
      <ReactSwagger spec={spec} />
    </section>
  )
}

export default ApiDocsPage
