import type { NonlinearExample } from '../models'

export default function ExampleWalkthrough({
  example,
}: {
  example: NonlinearExample
}) {
  const guide = example.guide
  if (!guide) return null
  return (
    <details className="example-walkthrough">
      <summary>
        예제 관찰 안내 <span>{guide.features.join(' · ')}</span>
      </summary>
      <div>
        <p>{guide.context}</p>
        <ol>
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <a href={guide.reference.url} target="_blank" rel="noreferrer">
          모형 배경: {guide.reference.label} ↗
        </a>
        <small>
          교과서 모형에 교육용 파라미터를 적용한 예제입니다. 접점 표시는 국소
          수치 검증이며 실제 장치·물질의 임계값을 뜻하지 않습니다.
        </small>
      </div>
    </details>
  )
}
