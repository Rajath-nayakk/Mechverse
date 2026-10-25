#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "DigitalMultimeterComponent.generated.h"

UENUM(BlueprintType)
enum class EDmmMode : uint8
{
	Off UMETA(DisplayName = "Off"),
	DcVolts UMETA(DisplayName = "DC Voltage"),
	Resistance UMETA(DisplayName = "Resistance (Ohms)"),
	Continuity UMETA(DisplayName = "Continuity Beeper"),
	DcAmps UMETA(DisplayName = "DC Amperes (10A Series)")
};

UENUM(BlueprintType)
enum class EDmmLeadJack : uint8
{
	VOhm UMETA(DisplayName = "V / Ohm / Continuity Jack"),
	A10A UMETA(DisplayName = "10A Current Jack")
};

USTRUCT(BlueprintType)
struct FDmmReading
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Multimeter")
	FString DisplayText;

	UPROPERTY(BlueprintReadOnly, Category = "Multimeter")
	FString UnitText;

	UPROPERTY(BlueprintReadOnly, Category = "Multimeter")
	bool bIsOverRange;

	UPROPERTY(BlueprintReadOnly, Category = "Multimeter")
	bool bIsHazard;

	UPROPERTY(BlueprintReadOnly, Category = "Multimeter")
	bool bIsContinuityBeep;

	UPROPERTY(BlueprintReadOnly, Category = "Multimeter")
	float NumericValue;

	FDmmReading()
		: DisplayText(TEXT("0.00"))
		, UnitText(TEXT("V DC"))
		, bIsOverRange(false)
		, bIsHazard(false)
		, bIsContinuityBeep(false)
		, NumericValue(0.0f)
	{}
};

UCLASS(ClassGroup=(Electrical), meta=(BlueprintSpawnableComponent))
class MECHVERSE_API UDigitalMultimeterComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UDigitalMultimeterComponent();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Multimeter|Configuration")
	EDmmMode CurrentMode;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Multimeter|Configuration")
	EDmmLeadJack RedLeadJack;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Multimeter|Probes")
	FString RedProbeNode;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Multimeter|Probes")
	FString BlackProbeNode;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Multimeter|Safety")
	bool bIsMeterFuseBlown;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Multimeter|Hardware")
	float InputImpedanceVolts; // 10 Megaohms

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Multimeter|Hardware")
	float BurdenResistanceAmps; // 0.01 Ohms

	UFUNCTION(BlueprintCallable, Category = "Multimeter")
	void SetMode(EDmmMode NewMode);

	UFUNCTION(BlueprintCallable, Category = "Multimeter")
	void ConnectProbes(const FString& InRedNode, const FString& InBlackNode);

	UFUNCTION(BlueprintCallable, Category = "Multimeter")
	FDmmReading TakeMeasurement(float SimulatedPotentialDiff, float SimulatedResistance, float SimulatedCurrent, bool bIsCircuitEnergized);

	UFUNCTION(BlueprintCallable, Category = "Multimeter")
	void ReplaceMeterFuse();
};
