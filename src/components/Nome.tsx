/** Nome com os algarismos na fonte de números (na Marcellus, "1" parece "I"). */
export function Nome({ children }: { children: string }) {
  return (
    <>
      {children.split(/(\d+)/).map((parte, i) =>
        /^\d+$/.test(parte) ? (
          <span key={i} className="numeros">
            {parte}
          </span>
        ) : (
          parte
        ),
      )}
    </>
  );
}
