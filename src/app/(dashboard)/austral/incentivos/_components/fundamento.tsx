export function Fundamento({ texto }: { texto: string }) {
  return <div className="whitespace-pre-line">
    {texto.split(/(\*\*[\s\S]+?\*\*)/g).map((parte, indice) =>
      parte.startsWith("**") && parte.endsWith("**")
        ? <strong key={indice} className="font-medium text-foreground">{parte.slice(2, -2)}</strong>
        : parte,
    )}
  </div>;
}
